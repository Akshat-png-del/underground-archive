#!/usr/bin/env npx tsx
/**
 * Complete existing HÖR Berlin catalog artists — data only.
 * Uses oEmbed/HTML where possible to avoid Spotify Web API rate limits.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { CatalogExpansion, ExpansionTrack } from "../src/lib/catalog/types";
import { getSpotifyCredentials } from "../src/lib/ingestion/config";
import { getArtistSeed } from "../src/lib/ingestion/seeds";
import {
  loadOrCreateMetadata,
  writeArtistMetadata,
} from "../src/lib/ingestion/store";
import { syncArtistPortrait } from "../src/lib/ingestion/portraits";
import { fetchSpotifyPortrait } from "../src/lib/ingestion/opengraph";
import { scrapeSpotifyDiscography } from "./lib/spotify-scrape";
import { sleep } from "../src/lib/ingestion/http";
import { YOUTUBE_VERIFIED_DURATIONS } from "../src/lib/catalog/youtube-verified-durations";

const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const HASH_FILE = join(process.cwd(), "src/content/artists/track-cover-hashes.json");
const REPORT_PATH = join(process.cwd(), "reports/hor-artists-completion.md");
const MIN_SET_SEC = 600;
const TARGET_MIN = 5;
const TARGET_MAX = 8;

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function isHorTitle(title: string, venue?: string): boolean {
  const t = fold(title);
  const e = fold(venue ?? "");
  return (
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t) ||
    /\bx\s+hor\b/.test(t) ||
    e.includes("hor berlin") ||
    venue === "HÖR Berlin"
  );
}

function listHorSlugs(): string[] {
  const slugs: string[] = [];
  for (const file of readdirSync(OUT_DIR)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    if (data.sets.some((s) => isHorTitle(s.title, s.venue))) slugs.push(data.slug);
  }
  return slugs.sort();
}

function loadExpansion(slug: string): CatalogExpansion {
  const path = join(OUT_DIR, `${slug}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as CatalogExpansion;
}

function saveExpansion(data: CatalogExpansion): void {
  data.updatedAt = new Date().toISOString();
  writeFileSync(join(OUT_DIR, `${data.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isFakeDuration(d: string | undefined): boolean {
  return !d || d === "5:00" || d === "0:00" || d === "3:00";
}

function loadHashes(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(HASH_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveHashes(hashes: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(HASH_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function extractHashFromThumb(url: string): string | null {
  const hash = url.split("/").pop()?.split("?")[0];
  return hash?.startsWith("ab67616d") ? hash : null;
}

async function fetchTrackOembed(trackId: string): Promise<{ title: string; hash: string | null } | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
      `https://open.spotify.com/track/${trackId}`,
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    const title = data.title?.replace(/\s*-\s*song.*$/i, "").trim();
    if (!title) return null;
    return { title, hash: data.thumbnail_url ? extractHashFromThumb(data.thumbnail_url) : null };
  } catch {
    return null;
  }
}

function formatDurationMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const creds = getSpotifyCredentials();
  if (!creds) return null;
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) return tokenCache.token;
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function fetchTrackDurationMs(trackId: string): Promise<number | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { duration_ms?: number };
  return data.duration_ms && data.duration_ms > 0 ? data.duration_ms : null;
}

interface RowReport {
  slug: string;
  portrait: string;
  tracksBefore: number;
  tracksAfter: number;
  removed: string[];
  errors: string[];
}

async function main() {
  const horSlugs = listHorSlugs();
  const only = process.argv[2];
  const slugs = only ? horSlugs.filter((s) => s === only || s.startsWith(only)) : horSlugs;
  const fetchDurations = process.env.HOR_FETCH_DURATIONS === "1";

  console.log(`Completing ${slugs.length} HÖR artists (oEmbed-first)…\n`);

  const coverHashes = loadHashes();
  const reports: RowReport[] = [];
  const globalOwner = new Map<string, string>();
  let api429 = false;

  for (const slug of slugs) {
    const seed = getArtistSeed(slug);
    const report: RowReport = {
      slug,
      portrait: "skip",
      tracksBefore: 0,
      tracksAfter: 0,
      removed: [],
      errors: [],
    };
    const exp = loadExpansion(slug);
    report.tracksBefore = exp.tracks.length;

    // ── Portrait (oEmbed, no Web API) ──
    try {
      const meta = loadOrCreateMetadata(seed ?? { slug, name: slug });
      const brokenLocal =
        meta.resolvedImage?.url?.startsWith("/images/") &&
        !existsSync(join(process.cwd(), "public", meta.resolvedImage.url.replace(/^\//, "")));
      if (brokenLocal && seed?.spotifyArtistId) {
        const img = await fetchSpotifyPortrait(seed.spotifyArtistId);
        if (img) {
          meta.resolvedImage = {
            url: img,
            source: "spotify",
            sourceUrl: `https://open.spotify.com/artist/${seed.spotifyArtistId}`,
          };
          meta.spotify = {
            ...(meta.spotify ?? {
              artistId: seed.spotifyArtistId,
              name: seed.name,
              url: `https://open.spotify.com/artist/${seed.spotifyArtistId}`,
              genres: [],
              followers: 0,
              popularity: 0,
              relatedArtists: [],
            }),
            imageUrl: img,
            imageUrls: [img],
          };
          meta.sources.spotify = { syncedAt: new Date().toISOString(), status: "ok" };
          writeArtistMetadata(meta);
          report.portrait = "oembed-fixed";
        }
      } else {
        const result = await syncArtistPortrait(meta);
        writeArtistMetadata(meta);
        report.portrait = result.status;
      }
    } catch (err) {
      report.errors.push(`portrait: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(350);

    if (!seed?.spotifyArtistId) {
      report.errors.push("no spotifyArtistId");
      reports.push(report);
      continue;
    }

    const artistId = seed.spotifyArtistId;
    let tracks: ExpansionTrack[] = [];

    // Keep valid existing tracks (strip fake duration)
    for (const t of exp.tracks) {
      if (!/^[a-zA-Z0-9]{22}$/.test(t.spotifyTrackId)) {
        report.removed.push(`invalid id ${t.title}`);
        continue;
      }
      tracks.push({
        ...t,
        duration: isFakeDuration(t.duration) ? "" : t.duration,
      });
    }

    // Scrape more if under minimum
    if (tracks.length < TARGET_MIN) {
      try {
        const scraped = await scrapeSpotifyDiscography(artistId, seed.name, TARGET_MAX);
        await sleep(400);
        for (const s of scraped) {
          if (tracks.some((t) => t.spotifyTrackId === s.id)) continue;
          tracks.push({
            title: s.title,
            spotifyTrackId: s.id,
            year: s.year,
            duration: isFakeDuration(s.duration) ? "" : s.duration,
          });
          if (tracks.length >= TARGET_MAX) break;
        }
      } catch (err) {
        report.errors.push(`scrape: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Enrich via oEmbed + optional API duration
    const enriched: ExpansionTrack[] = [];
    for (const t of tracks) {
      const oembed = await fetchTrackOembed(t.spotifyTrackId);
      await sleep(180);
      if (oembed?.hash) coverHashes[t.spotifyTrackId] = oembed.hash;

      let duration = isFakeDuration(t.duration) ? "" : t.duration;
      if (!duration && fetchDurations && !api429) {
        const ms = await fetchTrackDurationMs(t.spotifyTrackId);
        await sleep(1200);
        if (ms) duration = formatDurationMs(ms);
        else api429 = true;
      }

      enriched.push({
        title: oembed?.title ?? t.title,
        spotifyTrackId: t.spotifyTrackId,
        year: t.year,
        duration,
      });
    }

    // Dedupe within artist
    const seen = new Set<string>();
    const deduped = enriched.filter((t) => {
      if (seen.has(t.spotifyTrackId)) return false;
      seen.add(t.spotifyTrackId);
      return true;
    });

    // Global dedupe
    const kept: ExpansionTrack[] = [];
    for (const t of deduped) {
      const owner = globalOwner.get(t.spotifyTrackId);
      if (owner && owner !== slug) {
        report.removed.push(`${t.title} → owned by ${owner}`);
        continue;
      }
      globalOwner.set(t.spotifyTrackId, slug);
      kept.push(t);
    }
    tracks = kept;
    exp.tracks = tracks;
    exp.sets = exp.sets.filter((s) => {
      if (!isHorTitle(s.title, s.venue)) return true;
      const dur = YOUTUBE_VERIFIED_DURATIONS[s.youtubeId];
      if (!dur || dur.seconds < MIN_SET_SEC) {
        report.removed.push(`set ${s.youtubeId}`);
        return false;
      }
      return true;
    });

    report.tracksAfter = tracks.length;
    saveExpansion(exp);
    reports.push(report);
    console.log(`  ${slug}: portrait=${report.portrait} tracks=${tracks.length}`);
  }

  saveHashes(coverHashes);

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(
    REPORT_PATH,
    [
      "# HÖR Artists Completion",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "| Slug | Portrait | Tracks before | Tracks after |",
      "| --- | --- | ---: | ---: |",
      ...reports.map(
        (r) => `| ${r.slug} | ${r.portrait} | ${r.tracksBefore} | ${r.tracksAfter} |`,
      ),
      "",
      "**Playback files touched: 0**",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("\nBundling…");
  execSync("npm run expand:bundle", { stdio: "inherit" });
  execSync("npm run sync:bundle", { stdio: "inherit" });

  if (fetchDurations) {
    console.log("Regenerating Spotify duration registry…");
    execSync("npx tsx scripts/verify-spotify-track-durations.ts", { stdio: "inherit" });
  }

  console.log(`\nDone → ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
