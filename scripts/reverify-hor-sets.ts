#!/usr/bin/env npx tsx
/**
 * Re-verify every HÖR-tagged expansion set against official channel + duration.
 * Catalog only — no playback changes.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogExpansion } from "../src/lib/catalog/types";
import { getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import { scrapeSpotifyDiscography } from "./lib/spotify-scrape";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";

const HOR_CHANNEL_ID = "UCmfF7JZv26UUKyRedViGIlw";
const MIN = 600;
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");

function fold(t: string) {
  return t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function isHorTagged(venue: string, title: string) {
  const v = fold(venue);
  const t = fold(title);
  return (
    v.includes("hor berlin") ||
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t)
  );
}

function parseIso(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
}

async function main() {
  const key = getYoutubeApiKey()!;
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"));
  const horRefs: { slug: string; youtubeId: string; title: string }[] = [];

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    for (const s of data.sets) {
      if (isHorTagged(s.venue, s.title)) {
        horRefs.push({ slug: data.slug, youtubeId: s.youtubeId, title: s.title });
      }
    }
  }

  const ids = [...new Set(horRefs.map((r) => r.youtubeId))];
  const details = new Map<
    string,
    { channelId: string; channelTitle: string; seconds: number; public: boolean; title: string }
  >();

  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${chunk.join(",")}&key=${key}`;
    const data = await fetchJson<{
      items?: {
        id: string;
        snippet?: { title?: string; channelId?: string; channelTitle?: string };
        contentDetails?: { duration?: string };
        status?: { privacyStatus?: string };
      }[];
    }>(url, { provider: "youtube" });
    for (const it of data.items ?? []) {
      details.set(it.id, {
        channelId: it.snippet?.channelId ?? "",
        channelTitle: it.snippet?.channelTitle ?? "",
        seconds: parseIso(it.contentDetails?.duration ?? ""),
        public: it.status?.privacyStatus === "public",
        title: it.snippet?.title ?? "",
      });
    }
    await sleep(100);
  }

  const removed: { slug: string; youtubeId: string; reason: string }[] = [];

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    const next = data.sets.filter((s) => {
      if (!isHorTagged(s.venue, s.title)) return true;
      const d = details.get(s.youtubeId);
      if (!d) {
        removed.push({ slug: data.slug, youtubeId: s.youtubeId, reason: "missing on YouTube" });
        return false;
      }
      if (d.channelId !== HOR_CHANNEL_ID) {
        removed.push({
          slug: data.slug,
          youtubeId: s.youtubeId,
          reason: `non-official (${d.channelTitle})`,
        });
        return false;
      }
      if (!d.public) {
        removed.push({ slug: data.slug, youtubeId: s.youtubeId, reason: "not public" });
        return false;
      }
      if (d.seconds < MIN) {
        removed.push({
          slug: data.slug,
          youtubeId: s.youtubeId,
          reason: `too short (${d.seconds}s)`,
        });
        return false;
      }
      // Refresh canonical title from YouTube
      s.title = d.title || s.title;
      s.venue = "HÖR Berlin";
      return true;
    });
    if (next.length !== data.sets.length || JSON.stringify(next) !== JSON.stringify(data.sets)) {
      data.sets = next;
      data.updatedAt = new Date().toISOString();
      writeFileSync(join(OUT_DIR, file), `${JSON.stringify(data, null, 2)}\n`);
    }
  }

  // Fill Spotify for HÖR artists with <3 tracks
  const artists = [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists];
  const bySlug = new Map(artists.map((a) => [a.slug, a]));
  const trackFills: { slug: string; count: number }[] = [];

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    const hasHor = data.sets.some((s) => isHorTagged(s.venue, s.title));
    if (!hasHor || data.tracks.length >= 3) continue;
    const artist = bySlug.get(data.slug);
    if (!artist?.spotifyArtistId) continue;
    const scraped = await scrapeSpotifyDiscography(artist.spotifyArtistId, artist.name, 8);
    const existing = new Set(data.tracks.map((t) => t.spotifyTrackId));
    let n = 0;
    for (const t of scraped) {
      if (existing.has(t.id)) continue;
      data.tracks.push({
        title: t.title,
        spotifyTrackId: t.id,
        year: t.year,
        duration: t.duration || "",
      });
      existing.add(t.id);
      n++;
      if (data.tracks.length >= 10) break;
    }
    if (n > 0) {
      data.updatedAt = new Date().toISOString();
      writeFileSync(join(OUT_DIR, file), `${JSON.stringify(data, null, 2)}\n`);
      trackFills.push({ slug: data.slug, count: n });
    }
    await sleep(200);
  }

  const summary = { removed, trackFills, remainingHorIds: ids.length - removed.length };
  writeFileSync(".tmp/hor-reverify.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
