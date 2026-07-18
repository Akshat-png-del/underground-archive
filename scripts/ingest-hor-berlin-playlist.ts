#!/usr/bin/env npx tsx
/**
 * HÖR Berlin channel playlist ingest — avoids YouTube Search quota.
 * Pulls uploads from official channel playlist, matches catalog artists,
 * verifies duration ≥10m, writes expansions. Catalog/content only.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";
import type { CatalogExpansion, ExpansionSet } from "../src/lib/catalog/types";
import { getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import { scrapeSpotifyDiscography } from "./lib/spotify-scrape";

const HOR_CHANNEL_ID = "UCmfF7JZv26UUKyRedViGIlw";
/** Uploads playlist = UC → UU */
const HOR_UPLOADS_PLAYLIST = "UUmfF7JZv26UUKyRedViGIlw";
const MIN_SECONDS = 10 * 60;
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const MAX_PAGES = 25; // ~50 videos/page → up to 1250 uploads

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function hasOfficialHorBranding(title: string): boolean {
  const t = fold(title);
  return (
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t) ||
    /\bx\s+hor\b/.test(t) ||
    /\bttt\s+x\s+hor\b/.test(t)
  );
}

/** Livestream hour slots on the official channel: "VTSS / October 22 / 4pm-5pm" */
function looksLikeHorLivestreamSlot(title: string): boolean {
  const t = fold(title);
  return /\/\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*\//.test(
    t,
  ) || /\/\s*\w+\s+\d{1,2}\s*\/\s*\d{1,2}\s*(am|pm)/.test(t);
}

function artistMatchesTitle(artistName: string, title: string): boolean {
  const t = fold(title);
  const name = fold(artistName);
  if (!name) return false;
  if (t.includes(name)) return true;
  const tokens = name.split(/[^a-z0-9]+/).filter((p) => p.length > 2);
  if (tokens.length >= 2) return tokens.every((tok) => t.includes(tok));
  if (tokens.length === 1) {
    const tok = tokens[0];
    // Avoid tiny tokens matching noise
    if (tok.length < 4 && !/^\d+$/.test(tok)) return false;
    return new RegExp(`(^|[^a-z0-9])${tok}([^a-z0-9]|$)`).test(t);
  }
  return false;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
}

function extractYear(title: string, publishedAt?: string): number {
  const m = title.match(/\b(20\d{2})\b/);
  if (m) return parseInt(m[1], 10);
  if (publishedAt) return parseInt(publishedAt.slice(0, 4), 10);
  return new Date().getFullYear();
}

function loadExpansion(slug: string): CatalogExpansion {
  const path = join(OUT_DIR, `${slug}.json`);
  if (!existsSync(path)) return { slug, tracks: [], sets: [], updatedAt: new Date().toISOString() };
  return JSON.parse(readFileSync(path, "utf8")) as CatalogExpansion;
}

function saveExpansion(data: CatalogExpansion): void {
  mkdirSync(OUT_DIR, { recursive: true });
  data.updatedAt = new Date().toISOString();
  writeFileSync(join(OUT_DIR, `${data.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

interface PlaylistItem {
  contentDetails?: { videoId?: string };
  snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string } };
}

async function listUploadIds(key: string): Promise<{ id: string; title: string; publishedAt?: string }[]> {
  const out: { id: string; title: string; publishedAt?: string }[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails` +
      `&playlistId=${HOR_UPLOADS_PLAYLIST}&maxResults=50&key=${key}` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const data = await fetchJson<{
      items?: PlaylistItem[];
      nextPageToken?: string;
      error?: { message?: string };
    }>(url, { provider: "youtube" });
    if (data.error?.message) throw new Error(data.error.message);
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? "";
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        out.push({ id, title, publishedAt: item.snippet?.publishedAt });
      }
    }
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
    await sleep(100);
  }
  return out;
}

async function fetchVideoDetails(
  ids: string[],
  key: string,
): Promise<
  {
    id: string;
    title: string;
    channelId: string;
    seconds: number;
    public: boolean;
    publishedAt?: string;
  }[]
> {
  const out: {
    id: string;
    title: string;
    channelId: string;
    seconds: number;
    public: boolean;
    publishedAt?: string;
  }[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${chunk.join(",")}&key=${key}`;
    const data = await fetchJson<{
      items?: {
        id: string;
        snippet?: { title?: string; channelId?: string; publishedAt?: string };
        contentDetails?: { duration?: string };
        status?: { privacyStatus?: string };
      }[];
    }>(url, { provider: "youtube" });
    for (const item of data.items ?? []) {
      out.push({
        id: item.id,
        title: item.snippet?.title ?? "",
        channelId: item.snippet?.channelId ?? "",
        seconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
        public: item.status?.privacyStatus === "public",
        publishedAt: item.snippet?.publishedAt,
      });
    }
    await sleep(80);
  }
  return out;
}

async function main() {
  const key = getYoutubeApiKey();
  if (!key) {
    console.error("YOUTUBE_API_KEY required");
    process.exit(1);
  }

  const artists = [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists].map(
    (a) => ({ slug: a.slug, name: a.name, spotifyArtistId: a.spotifyArtistId }),
  );
  // Prefer longer names first when matching to reduce false positives
  const matchOrder = [...artists].sort((a, b) => b.name.length - a.name.length);

  console.log("Listing official HÖR uploads playlist…");
  const uploads = await listUploadIds(key);
  console.log(`Uploads listed: ${uploads.length}`);

  // Prefilter by branding or livestream slot + any artist token hint
  const candidates = uploads.filter((u) => {
    if (hasOfficialHorBranding(u.title) || looksLikeHorLivestreamSlot(u.title)) return true;
    return matchOrder.some((a) => artistMatchesTitle(a.name, u.title));
  });
  console.log(`Title-matched candidates: ${candidates.length}`);

  const details = await fetchVideoDetails(
    candidates.map((c) => c.id),
    key,
  );
  const detailMap = new Map(details.map((d) => [d.id, d]));

  const youtubeOwners = new Map<string, string>();
  for (const a of artists) {
    for (const s of loadExpansion(a.slug).sets) {
      if (!youtubeOwners.has(s.youtubeId)) youtubeOwners.set(s.youtubeId, a.slug);
    }
  }

  const added: { slug: string; youtubeId: string; title: string }[] = [];
  const skipped: { youtubeId: string; title: string; reason: string }[] = [];
  const touched = new Set<string>();

  for (const cand of candidates) {
    const d = detailMap.get(cand.id);
    if (!d) {
      skipped.push({ youtubeId: cand.id, title: cand.title, reason: "missing video details" });
      continue;
    }
    if (d.channelId !== HOR_CHANNEL_ID) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: "wrong channel" });
      continue;
    }
    if (!d.public) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: "not public" });
      continue;
    }
    if (d.seconds < MIN_SECONDS) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: `duration ${d.seconds}s` });
      continue;
    }

    const branded = hasOfficialHorBranding(d.title);
    const slot = looksLikeHorLivestreamSlot(d.title);
    if (!branded && !slot) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: "no HÖR branding / livestream slot" });
      continue;
    }

    const artist = matchOrder.find((a) => artistMatchesTitle(a.name, d.title));
    if (!artist) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: "no catalog artist match" });
      continue;
    }
    if (!artist.spotifyArtistId) {
      skipped.push({
        youtubeId: d.id,
        title: d.title,
        reason: `artist ${artist.slug} missing Spotify ID`,
      });
      continue;
    }

    const owner = youtubeOwners.get(d.id);
    if (owner && owner !== artist.slug) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: `owned by ${owner}` });
      continue;
    }

    const exp = loadExpansion(artist.slug);
    if (exp.sets.some((s) => s.youtubeId === d.id)) {
      skipped.push({ youtubeId: d.id, title: d.title, reason: "duplicate on artist" });
      continue;
    }

    const set: ExpansionSet = {
      title: d.title,
      venue: "HÖR Berlin",
      year: extractYear(d.title, d.publishedAt),
      youtubeId: d.id,
    };
    exp.sets.push(set);
    saveExpansion(exp);
    youtubeOwners.set(d.id, artist.slug);
    touched.add(artist.slug);
    added.push({ slug: artist.slug, youtubeId: d.id, title: d.title });
  }

  // Fill Spotify for newly touched artists still short on tracks
  const trackBatches: { slug: string; count: number }[] = [];
  for (const slug of touched) {
    const artist = artists.find((a) => a.slug === slug)!;
    if (!artist.spotifyArtistId) continue;
    const exp = loadExpansion(slug);
    if (exp.tracks.length >= 3) continue;
    const scraped = await scrapeSpotifyDiscography(artist.spotifyArtistId, artist.name, 8);
    const existing = new Set(exp.tracks.map((t) => t.spotifyTrackId));
    let n = 0;
    for (const t of scraped) {
      if (existing.has(t.id)) continue;
      exp.tracks.push({
        title: t.title,
        spotifyTrackId: t.id,
        year: t.year,
        duration: t.duration || "",
      });
      existing.add(t.id);
      n++;
      if (exp.tracks.length >= 10) break;
    }
    if (n > 0) {
      saveExpansion(exp);
      trackBatches.push({ slug, count: n });
    }
    await sleep(200);
  }

  const report = {
    uploadsListed: uploads.length,
    candidates: candidates.length,
    setsAdded: added,
    skipped: skipped.slice(0, 200),
    skippedTotal: skipped.length,
    trackBatches,
    touched: [...touched],
  };

  writeFileSync(".tmp/hor-playlist-ingest.json", JSON.stringify(report, null, 2));
  const md = [
    "# HÖR Berlin Playlist Ingest (no Search quota)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Channel uploads listed | ${uploads.length} |`,
    `| Candidates checked | ${candidates.length} |`,
    `| Sets added | ${added.length} |`,
    `| Skipped | ${skipped.length} |`,
    `| Artists touched | ${touched.size} |`,
    `| Spotify batches | ${trackBatches.length} |`,
    "",
    "## Sets added",
    "",
    ...added.map((s) => `- **${s.slug}** \`${s.youtubeId}\` — ${s.title}`),
    "",
  ].join("\n");
  writeFileSync("reports/hor-berlin-playlist-ingest.md", md);

  console.log(`Added ${added.length} sets across ${touched.size} artists`);
  console.log("Report → reports/hor-berlin-playlist-ingest.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
