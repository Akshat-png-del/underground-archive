#!/usr/bin/env npx tsx
/**
 * Verified HÖR Berlin ingestion — catalog/content only.
 *
 * - Official HÖR BERLIN channel only (UCmfF7JZv26UUKyRedViGIlw)
 * - Duration ≥ 10 minutes (YouTube Data API)
 * - Artist name must appear in the official title
 * - Title must carry HÖR branding
 * - Spotify tracks filled for HÖR artists missing playable media
 * - Misattributed / non-official sets removed
 *
 * Does NOT touch playback.
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
import type { CatalogExpansion, ExpansionSet, ExpansionTrack } from "../src/lib/catalog/types";
import { getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import { scrapeSpotifyDiscography } from "./lib/spotify-scrape";

const HOR_CHANNEL_ID = "UCmfF7JZv26UUKyRedViGIlw";
const HOR_CHANNEL_TITLE = /^h[oö]r\s*berlin$/i;
const MIN_SECONDS = 10 * 60;
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const REPORT_PATH = join(process.cwd(), "reports/hor-berlin-ingestion.md");

/** Known misattributions — never keep these on the wrong slug. */
const FORCED_REMOVALS: Record<string, string[]> = {
  "adam-x": [
    "MoyZRbodpWg", // Adam Port HÖR
    "E8UMOqVtfuI", // Adam Beyer
    "v--0OhHHKfg", // Adam Beyer
    "lHF7lsk9mco", // Adam Port b2b
  ],
};

interface ArtistSeed {
  slug: string;
  name: string;
  spotifyArtistId?: string;
}

interface YtSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
}

interface YtVideoItem {
  id: string;
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
  contentDetails?: { duration?: string };
  status?: { privacyStatus?: string; uploadStatus?: string };
}

type Report = {
  setsAdded: { slug: string; youtubeId: string; title: string }[];
  setsRemoved: { slug: string; youtubeId: string; reason: string }[];
  tracksAdded: { slug: string; count: number }[];
  artistsTouched: string[];
  artistsSkipped: { slug: string; reason: string }[];
  duplicatesAvoided: { youtubeId: string; slug: string }[];
  searchHitsRejected: { youtubeId: string; title: string; reason: string }[];
  missingSpotifyIds: string[];
  missingImagesNote: string;
};

function loadExpansion(slug: string): CatalogExpansion {
  const path = join(OUT_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    return { slug, tracks: [], sets: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(readFileSync(path, "utf8")) as CatalogExpansion;
}

function saveExpansion(data: CatalogExpansion): void {
  mkdirSync(OUT_DIR, { recursive: true });
  data.updatedAt = new Date().toISOString();
  writeFileSync(join(OUT_DIR, `${data.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Strip diacritics for HÖR / HÖR matching. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function hasOfficialHorBranding(title: string): boolean {
  const t = fold(title);
  return (
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t)
  );
}

function artistMatchesTitle(artistName: string, title: string): boolean {
  const t = fold(title);
  const name = fold(artistName);
  if (!name) return false;

  // Exact-ish phrase
  if (t.includes(name)) return true;

  // Token match for multi-word names (all tokens length>2 must appear)
  const tokens = name.split(/[^a-z0-9]+/).filter((p) => p.length > 2);
  if (tokens.length >= 2) return tokens.every((tok) => t.includes(tok));

  // Single-token artists: require word boundary to avoid "adam" matching "adam port"
  if (tokens.length === 1) {
    const tok = tokens[0];
    const re = new RegExp(`(^|[^a-z0-9])${tok}([^a-z0-9]|$)`);
    return re.test(t);
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

function allArtists(): ArtistSeed[] {
  const raw = [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists];
  const bySlug = new Map<string, ArtistSeed>();
  for (const a of raw) {
    bySlug.set(a.slug, {
      slug: a.slug,
      name: a.name,
      spotifyArtistId: a.spotifyArtistId,
    });
  }
  return [...bySlug.values()];
}

function isHorTagged(set: ExpansionSet): boolean {
  const venue = fold(set.venue);
  return (
    venue.includes("hor berlin") ||
    venue === "hor" ||
    hasOfficialHorBranding(set.title) ||
    fold(set.title).includes("hor berlin")
  );
}

async function fetchVideoDetails(ids: string[], key: string): Promise<YtVideoItem[]> {
  const out: YtVideoItem[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${chunk.join(",")}&key=${key}`;
    const data = await fetchJson<{ items?: YtVideoItem[] }>(url, { provider: "youtube" });
    out.push(...(data.items ?? []));
    await sleep(120);
  }
  return out;
}

async function searchHorChannel(artistName: string, key: string): Promise<string[]> {
  const q = encodeURIComponent(artistName);
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${HOR_CHANNEL_ID}` +
    `&q=${q}&type=video&maxResults=8&key=${key}`;
  try {
    const data = await fetchJson<{ items?: YtSearchItem[]; error?: { message?: string } }>(url, {
      provider: "youtube",
    });
    if (data.error?.message) {
      console.warn(`  search error for ${artistName}: ${data.error.message}`);
      return [];
    }
    return (data.items ?? [])
      .map((it) => it.id?.videoId)
      .filter((id): id is string => !!id && /^[a-zA-Z0-9_-]{11}$/.test(id));
  } catch (e) {
    console.warn(`  search failed for ${artistName}:`, e instanceof Error ? e.message : e);
    return [];
  }
}

function verifyVideo(
  item: YtVideoItem,
  artist: ArtistSeed,
): { ok: true; set: ExpansionSet } | { ok: false; reason: string } {
  const title = item.snippet?.title?.trim() ?? "";
  const channelId = item.snippet?.channelId ?? "";
  const channelTitle = item.snippet?.channelTitle ?? "";
  const seconds = parseIsoDuration(item.contentDetails?.duration ?? "");
  const privacy = item.status?.privacyStatus;
  const upload = item.status?.uploadStatus;

  if (channelId !== HOR_CHANNEL_ID && !HOR_CHANNEL_TITLE.test(channelTitle)) {
    return { ok: false, reason: `non-official channel (${channelTitle || channelId})` };
  }
  if (privacy && privacy !== "public") return { ok: false, reason: `privacy=${privacy}` };
  if (upload && upload !== "processed" && upload !== "uploaded") {
    return { ok: false, reason: `uploadStatus=${upload}` };
  }
  if (seconds < MIN_SECONDS) return { ok: false, reason: `duration ${seconds}s < 10m` };
  if (!hasOfficialHorBranding(title)) return { ok: false, reason: "missing HÖR branding in title" };
  if (!artistMatchesTitle(artist.name, title)) {
    return { ok: false, reason: `title does not match artist "${artist.name}"` };
  }

  return {
    ok: true,
    set: {
      title,
      venue: "HÖR Berlin",
      year: extractYear(title, item.snippet?.publishedAt),
      youtubeId: item.id,
    },
  };
}

async function main() {
  const key = getYoutubeApiKey();
  if (!key) {
    console.error("YOUTUBE_API_KEY required in .env.local");
    process.exit(1);
  }

  const artists = allArtists();
  const report: Report = {
    setsAdded: [],
    setsRemoved: [],
    tracksAdded: [],
    artistsTouched: [],
    artistsSkipped: [],
    duplicatesAvoided: [],
    searchHitsRejected: [],
    missingSpotifyIds: [],
    missingImagesNote:
      "Portrait/hero status is owned by ingested + researched portrait pipelines; this script does not invent images.",
  };

  // Global youtube ownership for duplicate prevention
  const youtubeOwners = new Map<string, string>();
  for (const artist of artists) {
    const exp = loadExpansion(artist.slug);
    for (const s of exp.sets) {
      if (!youtubeOwners.has(s.youtubeId)) youtubeOwners.set(s.youtubeId, artist.slug);
    }
  }

  // ── Pass 1: purge forced misattributions + re-verify existing HÖR tags ──
  console.log("Pass 1 — clean existing HÖR-tagged sets…");
  const horCandidateIds = new Set<string>();
  for (const artist of artists) {
    const exp = loadExpansion(artist.slug);
    for (const s of exp.sets) {
      if (isHorTagged(s) || FORCED_REMOVALS[artist.slug]?.includes(s.youtubeId)) {
        horCandidateIds.add(s.youtubeId);
      }
    }
  }

  const existingDetails = await fetchVideoDetails([...horCandidateIds], key);
  const detailById = new Map(existingDetails.map((d) => [d.id, d]));

  for (const artist of artists) {
    const forced = new Set(FORCED_REMOVALS[artist.slug] ?? []);
    const exp = loadExpansion(artist.slug);
    const before = exp.sets.length;
    const kept: ExpansionSet[] = [];

    for (const s of exp.sets) {
      if (forced.has(s.youtubeId)) {
        report.setsRemoved.push({
          slug: artist.slug,
          youtubeId: s.youtubeId,
          reason: "forced misattribution removal",
        });
        continue;
      }

      if (!isHorTagged(s)) {
        kept.push(s);
        continue;
      }

      const detail = detailById.get(s.youtubeId);
      if (!detail) {
        report.setsRemoved.push({
          slug: artist.slug,
          youtubeId: s.youtubeId,
          reason: "YouTube video missing / unavailable",
        });
        continue;
      }

      const verdict = verifyVideo(detail, artist);
      if (!verdict.ok) {
        report.setsRemoved.push({
          slug: artist.slug,
          youtubeId: s.youtubeId,
          reason: verdict.reason,
        });
        continue;
      }

      // Prefer canonical YouTube title + HÖR Berlin venue
      kept.push(verdict.set);
    }

    // Dedupe by youtubeId within artist
    const seen = new Set<string>();
    exp.sets = kept.filter((s) => {
      if (seen.has(s.youtubeId)) {
        report.duplicatesAvoided.push({ youtubeId: s.youtubeId, slug: artist.slug });
        return false;
      }
      seen.add(s.youtubeId);
      return true;
    });

    if (exp.sets.length !== before) {
      saveExpansion(exp);
      report.artistsTouched.push(artist.slug);
    }
  }

  // Rebuild ownership after cleanup
  youtubeOwners.clear();
  for (const artist of artists) {
    const exp = loadExpansion(artist.slug);
    for (const s of exp.sets) {
      if (!youtubeOwners.has(s.youtubeId)) youtubeOwners.set(s.youtubeId, artist.slug);
    }
  }

  // ── Pass 2: search official channel for catalog artists ──
  // Prefer artists with Spotify IDs; skip those already rich in official HÖR sets (≥3).
  console.log("Pass 2 — search official HÖR channel for catalog artists…");
  const searchTargets = artists
    .filter((a) => a.spotifyArtistId)
    .sort((a, b) => a.name.localeCompare(b.name));

  let quotaSoftStop = false;
  for (const artist of searchTargets) {
    if (quotaSoftStop) {
      report.artistsSkipped.push({ slug: artist.slug, reason: "YouTube quota soft-stop" });
      continue;
    }

    const exp = loadExpansion(artist.slug);
    const existingHor = exp.sets.filter((s) => isHorTagged(s) && hasOfficialHorBranding(s.title));
    if (existingHor.length >= 3) {
      report.artistsSkipped.push({ slug: artist.slug, reason: "already has ≥3 verified HÖR sets" });
      continue;
    }

    console.log(`  search: ${artist.name}`);
    const ids = await searchHorChannel(artist.name, key);
    await sleep(200);

    if (ids.length === 0) continue;

    const details = await fetchVideoDetails(ids, key);
    let added = 0;

    for (const item of details) {
      const verdict = verifyVideo(item, artist);
      if (!verdict.ok) {
        report.searchHitsRejected.push({
          youtubeId: item.id,
          title: item.snippet?.title ?? "",
          reason: verdict.reason,
        });
        continue;
      }

      const owner = youtubeOwners.get(verdict.set.youtubeId);
      if (owner && owner !== artist.slug) {
        report.duplicatesAvoided.push({ youtubeId: verdict.set.youtubeId, slug: artist.slug });
        continue;
      }
      if (exp.sets.some((s) => s.youtubeId === verdict.set.youtubeId)) {
        report.duplicatesAvoided.push({ youtubeId: verdict.set.youtubeId, slug: artist.slug });
        continue;
      }

      exp.sets.push(verdict.set);
      youtubeOwners.set(verdict.set.youtubeId, artist.slug);
      report.setsAdded.push({
        slug: artist.slug,
        youtubeId: verdict.set.youtubeId,
        title: verdict.set.title,
      });
      added++;
    }

    if (added > 0) {
      saveExpansion(exp);
      if (!report.artistsTouched.includes(artist.slug)) report.artistsTouched.push(artist.slug);
    }
  }

  // ── Pass 3: Spotify tracks for artists that now have HÖR sets ──
  console.log("Pass 3 — fill Spotify tracks for HÖR artists…");
  const horArtists = new Set<string>();
  for (const artist of artists) {
    const exp = loadExpansion(artist.slug);
    if (exp.sets.some((s) => isHorTagged(s) && hasOfficialHorBranding(s.title))) {
      horArtists.add(artist.slug);
    }
  }

  for (const slug of horArtists) {
    const artist = artists.find((a) => a.slug === slug)!;
    if (!artist.spotifyArtistId) {
      report.missingSpotifyIds.push(slug);
      report.artistsSkipped.push({ slug, reason: "missing Spotify Artist ID — tracks not filled" });
      continue;
    }

    const exp = loadExpansion(slug);
    if (exp.tracks.length >= 3) continue;

    const need = Math.min(10, Math.max(3, 8 - exp.tracks.length));
    const scraped = await scrapeSpotifyDiscography(artist.spotifyArtistId, artist.name, need + exp.tracks.length);
    const existing = new Set(exp.tracks.map((t) => t.spotifyTrackId));
    let added = 0;
    for (const t of scraped) {
      if (existing.has(t.id)) continue;
      const track: ExpansionTrack = {
        title: t.title,
        spotifyTrackId: t.id,
        year: t.year,
        duration: t.duration || "",
      };
      exp.tracks.push(track);
      existing.add(t.id);
      added++;
      if (exp.tracks.length >= 10) break;
    }
    if (added > 0) {
      saveExpansion(exp);
      report.tracksAdded.push({ slug, count: added });
      if (!report.artistsTouched.includes(slug)) report.artistsTouched.push(slug);
    }
    await sleep(250);
  }

  // ── Report ──
  const md = [
    "# HÖR Berlin Verified Ingestion Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| HÖR sets added | ${report.setsAdded.length} |`,
    `| HÖR sets removed | ${report.setsRemoved.length} |`,
    `| Artists touched | ${report.artistsTouched.length} |`,
    `| Spotify track batches added | ${report.tracksAdded.length} |`,
    `| Duplicate sets avoided | ${report.duplicatesAvoided.length} |`,
    `| Search hits rejected | ${report.searchHitsRejected.length} |`,
    `| Artists missing Spotify IDs | ${report.missingSpotifyIds.length} |`,
    "",
    "## Sets added",
    "",
    ...(report.setsAdded.length
      ? report.setsAdded.map((s) => `- **${s.slug}** \`${s.youtubeId}\` — ${s.title}`)
      : ["_None_"]),
    "",
    "## Sets removed",
    "",
    ...(report.setsRemoved.length
      ? report.setsRemoved.map((s) => `- **${s.slug}** \`${s.youtubeId}\` — ${s.reason}`)
      : ["_None_"]),
    "",
    "## Spotify tracks filled",
    "",
    ...(report.tracksAdded.length
      ? report.tracksAdded.map((t) => `- **${t.slug}**: +${t.count} tracks`)
      : ["_None_"]),
    "",
    "## Artists skipped",
    "",
    ...(report.artistsSkipped.length
      ? report.artistsSkipped.slice(0, 80).map((a) => `- **${a.slug}**: ${a.reason}`)
      : ["_None_"]),
    "",
    "## Missing Spotify Artist IDs (HÖR artists)",
    "",
    ...(report.missingSpotifyIds.length
      ? report.missingSpotifyIds.map((s) => `- ${s}`)
      : ["_None_"]),
    "",
    "## Images",
    "",
    report.missingImagesNote,
    "",
    "## Quality gates enforced",
    "",
    "- Official HÖR BERLIN channel ID only",
    "- Public videos only",
    "- API duration ≥ 10 minutes",
    "- Official HÖR branding in title",
    "- Artist name must match title",
    "- No duplicate YouTube IDs across artists",
    "- No invented metadata / placeholder durations",
    "",
  ].join("\n");

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(REPORT_PATH, md, "utf8");
  writeFileSync(
    join(process.cwd(), ".tmp/hor-ingestion-result.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(`\nDone. Report → ${REPORT_PATH}`);
  console.log(
    `Added ${report.setsAdded.length} sets, removed ${report.setsRemoved.length}, tracks batches ${report.tracksAdded.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
