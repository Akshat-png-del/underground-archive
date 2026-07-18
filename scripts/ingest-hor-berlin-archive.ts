#!/usr/bin/env npx tsx
/**
 * Complete VERIFIED HÖR BERLIN archive ingest.
 *
 * Source of truth: official HÖR BERLIN uploads playlist only
 * (UUmfF7JZv26UUKyRedViGIlw). No YouTube Search.
 *
 * Catalog / content only — never touches playback.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists, bulkCatalogSeeds } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists, expansionCatalogSeeds } from "../src/content/artists/catalog-expansion";
import {
  AUTHENTICITY_REMOVED_SLUGS,
} from "../src/content/artists/authenticity-removals";
import type { CatalogExpansion, ExpansionSet, ExpansionTrack } from "../src/lib/catalog/types";
import type { Genre } from "../src/types";
import { getYoutubeApiKey, getSpotifyCredentials, ARTISTS_METADATA_DIR } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import {
  searchSpotifyArtist,
  isSpotifyConfigured,
} from "../src/lib/ingestion/spotify";
import { mapExternalGenres } from "../src/lib/ingestion/genres";
import { fetchMusicBrainzArtist } from "../src/lib/ingestion/musicbrainz";
import type { ArtistIngestedMetadata } from "../src/lib/ingestion/types";
import { slugify } from "../src/lib/music";

const HOR_CHANNEL_ID = "UCmfF7JZv26UUKyRedViGIlw";
const HOR_UPLOADS_PLAYLIST = "UUmfF7JZv26UUKyRedViGIlw";
const MIN_SECONDS = 10 * 60;
const MAX_PAGES = 200; // up to 10_000 uploads (complete channel walk)
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const INGEST_DIR = join(process.cwd(), ARTISTS_METADATA_DIR);
const NEW_ARTISTS_PATH = join(process.cwd(), "data/hor-berlin-new-artists.json");
const REPORT_PATH = join(process.cwd(), "reports/hor-berlin-archive.md");
const SEEDS_TS_PATH = join(process.cwd(), "src/content/artists/hor-berlin-seeds.ts");
const CACHE_PATH = join(process.cwd(), ".tmp/hor-eligible-sets.json");

/** Minimum Spotify presence to treat as internationally recognized. */
const MIN_FOLLOWERS = 5_000;
const MIN_POPULARITY = 15;

const SKIP_TITLE =
  /\b(trailer|teaser|clip|short|shorts|aftermovie|recap|announcement|promo|preview|snippet|highlights?|countdown|interview|podcast|talk|q\s*&\s*a)\b|#shorts?/i;

interface CatalogArtist {
  slug: string;
  name: string;
  spotifyArtistId?: string;
  country?: string;
  city?: string;
  genres?: Genre[];
}

interface NewArtistSeed {
  slug: string;
  name: string;
  country: string;
  city: string;
  activeSince: number;
  genres: Genre[];
  labels: string[];
  similarArtists: string[];
  spotifyArtistId: string;
  followers: number;
  popularity: number;
}

interface Report {
  uploadsListed: number;
  verifiedEligible: number;
  setsAdded: { slug: string; youtubeId: string; title: string }[];
  setsSkipped: { youtubeId: string; title: string; reason: string }[];
  artistsCreated: NewArtistSeed[];
  artistsReintroduced: string[];
  tracksAdded: { slug: string; count: number }[];
  duplicatesAvoided: number;
  verificationFailures: { youtubeId: string; reason: string }[];
  skippedArtists: { name: string; reason: string }[];
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th");
}

function hasOfficialHorBranding(title: string): boolean {
  const t = fold(title);
  return (
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t) ||
    /\bx\s+hor\b/.test(t)
  );
}

function looksLikeHorLivestreamSlot(title: string): boolean {
  const t = fold(title);
  return /\/\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*\//.test(
    t,
  );
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

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Extract primary artist display name from an official HÖR title. */
function parseHorArtistName(title: string): string | null {
  if (SKIP_TITLE.test(title)) return null;

  // "Name | HÖR…" or "Label - Name | HÖR…"
  const pipe = title.match(/^(.+?)\s*\|\s*H/i);
  if (pipe) {
    let left = pipe[1].trim();
    // Drop Face2Face / curated-by wrappers that aren't the performing artist
    if (/^(face\s*2\s*face|f2f|tba|curated by)\b/i.test(left)) {
      const after = left.match(/\s+-\s+(.+)$/);
      if (after) left = after[1].trim();
      else return null;
    }
    const dash = left.match(/^.+?\s+-\s+(.+)$/);
    if (dash) left = dash[1].trim();
    left = left
      .replace(/^(f2f|face\s*2\s*face)\s+/i, "")
      .replace(/\s*\(LIVE\)\s*/gi, " ")
      .replace(/\s+b2b\s+.+$/i, "")
      .replace(/\s+&\s+.+$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    // Strip trailing alias numbers like Regal86 → keep as-is for matching (aliases map handles)
    if (left.length < 2) return null;
    return left;
  }

  // Livestream slot: "VTSS / October 22 / 4pm-5pm"
  const slot = title.match(
    /^([^\/|]+?)\s*\/\s*(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
  );
  if (slot) {
    const name = slot[1].trim().replace(/\s*\(LIVE\)\s*/gi, " ").trim();
    if (name.length >= 2 && !SKIP_TITLE.test(name)) return name;
  }

  return null;
}

function namesClose(a: string, b: string): boolean {
  const fa = fold(a).replace(/[^a-z0-9]+/g, "");
  const fb = fold(b).replace(/[^a-z0-9]+/g, "");
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  // Trailing digit aliases: regal86 ↔ regal
  const stripA = fa.replace(/\d+$/, "");
  const stripB = fb.replace(/\d+$/, "");
  if (stripA.length >= 4 && stripA === stripB) return true;
  // "Boris S." ↔ "Boris" (trailing single-letter initial)
  const noInitialA = fold(a)
    .replace(/\b[a-z]\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "");
  const noInitialB = fold(b)
    .replace(/\b[a-z]\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "");
  if (noInitialA.length >= 4 && noInitialA === noInitialB) return true;
  return false;
}

/** Strict catalog match for HÖR titles — exact/near-exact, or clear name token in title. */
function findCatalogMatch(
  parsedName: string,
  catalog: CatalogArtist[],
  fullTitle?: string,
): CatalogArtist | null {
  const parsed = fold(parsedName).replace(/[^a-z0-9]+/g, "");
  if (parsed.length < 3) return null;

  let best: CatalogArtist | null = null;
  let bestLen = 0;
  for (const a of catalog) {
    if (namesClose(a.name, parsedName)) {
      const len = fold(a.name).replace(/[^a-z0-9]+/g, "").length;
      if (len > bestLen) {
        best = a;
        bestLen = len;
      }
      continue;
    }
    // "Go Hard - Rebekah | HÖR" where parsed may be "Rebekah" (already) —
    // also allow artist name as a whole word in the full title when unique.
    if (fullTitle) {
      const titleFold = fold(fullTitle);
      const nameFold = fold(a.name);
      if (nameFold.replace(/[^a-z0-9]/g, "").length < 4) continue;
      const re = new RegExp(
        `(^|[^a-z0-9])${nameFold.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      );
      if (re.test(titleFold)) {
        const len = nameFold.replace(/[^a-z0-9]+/g, "").length;
        // Prefer longer artist names to avoid short false tokens
        if (len > bestLen) {
          best = a;
          bestLen = len;
        }
      }
    }
  }
  return best;
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

function saveIngested(meta: ArtistIngestedMetadata): void {
  mkdirSync(INGEST_DIR, { recursive: true });
  writeFileSync(join(INGEST_DIR, `${meta.slug}.json`), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

function allCatalogArtists(): CatalogArtist[] {
  // Include authenticity-removed seeds so we can reintroduce them when HÖR+Spotify verify.
  const raw = [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists];
  const bySlug = new Map<string, CatalogArtist>();
  for (const a of raw) {
    bySlug.set(a.slug, {
      slug: a.slug,
      name: a.name,
      spotifyArtistId: a.spotifyArtistId,
      country: a.country,
      city: a.city,
      genres: a.genres as Genre[],
    });
  }
  // Prefer canonical seed names (incl. authenticity-removed) over slug humanization
  for (const seed of [...expansionCatalogSeeds, ...bulkCatalogSeeds]) {
    if (bySlug.has(seed.slug)) {
      const cur = bySlug.get(seed.slug)!;
      bySlug.set(seed.slug, {
        ...cur,
        name: seed.name,
        spotifyArtistId: seed.spotifyArtistId ?? cur.spotifyArtistId,
        country: seed.country ?? cur.country,
        city: seed.city ?? cur.city,
        genres: (seed.genres as Genre[]) ?? cur.genres,
      });
      continue;
    }
    bySlug.set(seed.slug, {
      slug: seed.slug,
      name: seed.name,
      spotifyArtistId: seed.spotifyArtistId,
      country: seed.country,
      city: seed.city,
      genres: seed.genres as Genre[],
    });
  }
  return [...bySlug.values()];
}

async function listUploads(key: string) {
  const out: { id: string; title: string; publishedAt?: string }[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails` +
      `&playlistId=${HOR_UPLOADS_PLAYLIST}&maxResults=50&key=${key}` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const data = await fetchJson<{
      items?: {
        contentDetails?: { videoId?: string };
        snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string } };
      }[];
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
    console.log(`  playlist page ${page + 1}: ${out.length} uploads so far`);
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
    await sleep(80);
  }
  return out;
}

async function fetchVideoDetails(ids: string[], key: string) {
  const out: {
    id: string;
    title: string;
    channelId: string;
    seconds: number;
    public: boolean;
    publishedAt?: string;
    thumb?: string;
  }[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${chunk.join(",")}&key=${key}`;
    const data = await fetchJson<{
      items?: {
        id: string;
        snippet?: {
          title?: string;
          channelId?: string;
          publishedAt?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
        };
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
        thumb:
          item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url,
      });
    }
    await sleep(60);
  }
  return out;
}

async function fetchTopTracks(
  artistId: string,
): Promise<ExpansionTrack[]> {
  const creds = getSpotifyCredentials();
  if (!creds) return [];
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!auth.ok) return [];
  const token = ((await auth.json()) as { access_token: string }).access_token;
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    tracks?: {
      id: string;
      name: string;
      duration_ms: number;
      album?: { release_date?: string; images?: { url: string }[] };
    }[];
  };
  const tracks: ExpansionTrack[] = [];
  for (const t of data.tracks ?? []) {
    if (!/^[a-zA-Z0-9]{22}$/.test(t.id)) continue;
    const year = t.album?.release_date
      ? parseInt(t.album.release_date.slice(0, 4), 10)
      : new Date().getFullYear();
    tracks.push({
      title: t.name,
      spotifyTrackId: t.id,
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      duration: formatDuration(t.duration_ms),
    });
  }
  return tracks;
}

function writeHorBerlinSeedsTs(seeds: NewArtistSeed[]): void {
  const body = seeds
    .map((s) => {
      const genres = s.genres.map((g) => `"${g}"`).join(", ");
      const similar = s.similarArtists.map((x) => `"${x}"`).join(", ");
      const labels = s.labels.map((x) => `"${x}"`).join(", ");
      return `  {
    slug: ${JSON.stringify(s.slug)},
    name: ${JSON.stringify(s.name)},
    country: ${JSON.stringify(s.country)},
    city: ${JSON.stringify(s.city)},
    activeSince: ${s.activeSince},
    genres: [${genres}] as Genre[],
    labels: [${labels}],
    similarArtists: [${similar}],
    spotifyArtistId: ${JSON.stringify(s.spotifyArtistId)},
  }`;
    })
    .join(",\n");

  const ts = `/**
 * AUTO-GENERATED by scripts/ingest-hor-berlin-archive.ts
 * Verified HÖR Berlin artists not previously in the catalog.
 * Do not edit by hand — re-run the ingest script.
 */
import type { Genre } from "@/types";
import { createCatalogArtist, type CatalogEntry } from "./builder";

interface HorSeed {
  slug: string;
  name: string;
  country: string;
  city: string;
  activeSince: number;
  genres: Genre[];
  labels: string[];
  similarArtists: string[];
  spotifyArtistId: string;
}

const SEEDS: HorSeed[] = [
${body}
];

function toEntry(idx: number, seed: HorSeed): CatalogEntry {
  return {
    slug: seed.slug,
    name: seed.name,
    country: seed.country,
    city: seed.city,
    scene: seed.city,
    activeSince: seed.activeSince,
    genres: seed.genres,
    verificationStatus: "partial",
    spotifyArtistId: seed.spotifyArtistId,
    labels: seed.labels,
    bpmRange: [140, 155],
    similarArtists: seed.similarArtists,
    tracks: [],
  };
}

export const horBerlinCatalogArtists = SEEDS.map((seed, i) =>
  createCatalogArtist(toEntry(i + 900, seed)),
);
`;
  writeFileSync(SEEDS_TS_PATH, ts, "utf8");
}

function ensureAllTsImportsHorSeeds(): void {
  const path = join(process.cwd(), "src/content/artists/all.ts");
  let src = readFileSync(path, "utf8");
  if (src.includes("horBerlinCatalogArtists")) return;
  src = src.replace(
    `import { expansionCatalogArtists } from "./catalog-expansion";`,
    `import { expansionCatalogArtists } from "./catalog-expansion";\nimport { horBerlinCatalogArtists } from "./hor-berlin-seeds";`,
  );
  src = src.replace(
    `  ...expansionCatalogArtists,\n];`,
    `  ...expansionCatalogArtists,\n  ...horBerlinCatalogArtists,\n];`,
  );
  writeFileSync(path, src, "utf8");
}

function reintroduceArtists(slugs: string[]): void {
  if (slugs.length === 0) return;
  const path = join(process.cwd(), "src/content/artists/authenticity-removals.ts");
  let src = readFileSync(path, "utf8");
  for (const slug of slugs) {
    src = src.replace(new RegExp(`\\n\\s*"${slug}",?`, "g"), "\n");
  }
  writeFileSync(path, src, "utf8");
}

type EligibleSet = {
  id: string;
  title: string;
  channelId: string;
  seconds: number;
  public: boolean;
  publishedAt?: string;
  thumb?: string;
};

function loadEligibleCache(): EligibleSet[] | null {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    const rows = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as EligibleSet[];
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function saveEligibleCache(rows: EligibleSet[]): void {
  mkdirSync(join(process.cwd(), ".tmp"), { recursive: true });
  writeFileSync(CACHE_PATH, `${JSON.stringify(rows)}\n`, "utf8");
}

async function resolveNewArtist(
  parsed: string,
  catalog: CatalogArtist[],
  newBySlug: Map<string, NewArtistSeed>,
  report: Report,
): Promise<{ artist: CatalogArtist; seed: NewArtistSeed } | null> {
  let spotify;
  try {
    spotify = await searchSpotifyArtist(parsed);
  } catch (err) {
    report.skippedArtists.push({
      name: parsed,
      reason: `Spotify search error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
  await sleep(150);

  if (!spotify?.artistId) {
    report.skippedArtists.push({ name: parsed, reason: "no Spotify artist found" });
    return null;
  }
  // Retry once if follower data looks empty (often rate-limit / partial payload)
  if (spotify.followers === 0 && spotify.popularity === 0) {
    await sleep(1500);
    try {
      spotify = await searchSpotifyArtist(parsed);
    } catch {
      /* keep previous */
    }
  }
  if (!spotify?.artistId) {
    report.skippedArtists.push({ name: parsed, reason: "no Spotify artist found" });
    return null;
  }
  if (!namesClose(spotify.name, parsed)) {
    report.skippedArtists.push({
      name: parsed,
      reason: `Spotify name mismatch ("${spotify.name}")`,
    });
    return null;
  }
  if (spotify.followers < MIN_FOLLOWERS && spotify.popularity < MIN_POPULARITY) {
    report.skippedArtists.push({
      name: parsed,
      reason: `insufficient Spotify presence (followers=${spotify.followers}, pop=${spotify.popularity})`,
    });
    return null;
  }
  if (!spotify.imageUrl) {
    report.skippedArtists.push({ name: parsed, reason: "missing Spotify artist image" });
    return null;
  }

  let top: ExpansionTrack[] = [];
  try {
    top = await fetchTopTracks(spotify.artistId);
  } catch (err) {
    report.skippedArtists.push({
      name: parsed,
      reason: `Spotify top-tracks error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
  await sleep(120);
  if (top.length < 3) {
    report.skippedArtists.push({
      name: parsed,
      reason: `fewer than 3 Spotify top tracks (${top.length})`,
    });
    return null;
  }

  const mb = await fetchMusicBrainzArtist(spotify.name).catch(() => null);
  await sleep(1100);
  const country = mb?.country?.trim() || "";
  if (!country || country.length < 2) {
    report.skippedArtists.push({
      name: parsed,
      reason: "missing verified country (MusicBrainz)",
    });
    return null;
  }

  const slug = slugify(spotify.name);
  if (!slug) {
    report.skippedArtists.push({ name: parsed, reason: "could not slugify name" });
    return null;
  }
  const existing = catalog.find((c) => c.slug === slug);
  if (existing) {
    const seed = newBySlug.get(slug);
    if (seed) return { artist: existing, seed };
    // Catalog already has this slug — attach sets without creating a seed
    return {
      artist: existing,
      seed: {
        slug,
        name: existing.name,
        country: existing.country ?? country,
        city: existing.city ?? country,
        activeSince: 2015,
        genres: existing.genres ?? (["hard-techno"] as Genre[]),
        labels: [],
        similarArtists: [],
        spotifyArtistId: existing.spotifyArtistId ?? spotify.artistId,
        followers: spotify.followers,
        popularity: spotify.popularity,
      },
    };
  }
  if (newBySlug.has(slug)) {
    const seed = newBySlug.get(slug)!;
    return {
      artist: {
        slug,
        name: seed.name,
        spotifyArtistId: seed.spotifyArtistId,
        genres: seed.genres,
        country: seed.country,
        city: seed.city,
      },
      seed,
    };
  }

  const genres = mapExternalGenres(spotify.genres);
  const seed: NewArtistSeed = {
    slug,
    name: spotify.name,
    country,
    city: country === "DE" || country === "Germany" ? "Berlin" : country,
    activeSince: 2015,
    genres: genres.length > 0 ? genres : (["hard-techno"] as Genre[]),
    labels: [],
    similarArtists: [],
    spotifyArtistId: spotify.artistId,
    followers: spotify.followers,
    popularity: spotify.popularity,
  };

  const exp = loadExpansion(slug);
  const existingIds = new Set(exp.tracks.map((t) => t.spotifyTrackId));
  let addedTracks = 0;
  for (const t of top) {
    if (existingIds.has(t.spotifyTrackId)) continue;
    exp.tracks.push(t);
    existingIds.add(t.spotifyTrackId);
    addedTracks++;
  }
  saveExpansion(exp);
  if (addedTracks > 0) report.tracksAdded.push({ slug, count: addedTracks });

  saveIngested({
    slug,
    name: spotify.name,
    updatedAt: new Date().toISOString(),
    sources: {
      spotify: { syncedAt: new Date().toISOString(), status: "ok" },
    },
    spotify: {
      artistId: spotify.artistId,
      name: spotify.name,
      url: spotify.url,
      genres: spotify.genres,
      followers: spotify.followers,
      popularity: spotify.popularity,
      imageUrl: spotify.imageUrl,
      imageUrls: spotify.imageUrls,
      relatedArtists: spotify.relatedArtists,
    },
    resolvedImage: {
      url: spotify.imageUrl,
      source: "spotify",
      sourceUrl: spotify.url,
    },
  });

  return {
    artist: {
      slug,
      name: spotify.name,
      spotifyArtistId: spotify.artistId,
      genres: seed.genres,
      country: seed.country,
      city: seed.city,
    },
    seed,
  };
}

async function main() {
  const key = getYoutubeApiKey();
  if (!key) {
    console.error("YOUTUBE_API_KEY required");
    process.exit(1);
  }
  if (!isSpotifyConfigured()) {
    console.error("SPOTIFY_CLIENT_ID/SECRET required");
    process.exit(1);
  }

  const report: Report = {
    uploadsListed: 0,
    verifiedEligible: 0,
    setsAdded: [],
    setsSkipped: [],
    artistsCreated: [],
    artistsReintroduced: [],
    tracksAdded: [],
    duplicatesAvoided: 0,
    verificationFailures: [],
    skippedArtists: [],
  };

  console.log("Listing official HÖR BERLIN uploads playlist…");
  let eligible = loadEligibleCache();
  if (eligible) {
    console.log(`Resuming from cache: ${eligible.length} eligible sets`);
    report.uploadsListed = eligible.length;
    report.verifiedEligible = eligible.length;
  } else {
    const uploads = await listUploads(key);
    report.uploadsListed = uploads.length;
    console.log(`Listed ${uploads.length} uploads`);

    const candidates = uploads.filter((u) => {
      if (SKIP_TITLE.test(u.title)) return false;
      return hasOfficialHorBranding(u.title) || looksLikeHorLivestreamSlot(u.title);
    });
    console.log(`Branded/livestream candidates: ${candidates.length}`);

    console.log("Fetching video details…");
    const details = await fetchVideoDetails(
      candidates.map((c) => c.id),
      key,
    );

    eligible = details.filter((d) => {
      if (d.channelId !== HOR_CHANNEL_ID) {
        report.verificationFailures.push({ youtubeId: d.id, reason: "wrong channel" });
        return false;
      }
      if (!d.public) {
        report.verificationFailures.push({ youtubeId: d.id, reason: "not public" });
        return false;
      }
      if (d.seconds < MIN_SECONDS) {
        report.verificationFailures.push({
          youtubeId: d.id,
          reason: `duration ${d.seconds}s < 10m`,
        });
        return false;
      }
      if (SKIP_TITLE.test(d.title)) {
        report.verificationFailures.push({ youtubeId: d.id, reason: "clip/teaser title" });
        return false;
      }
      return true;
    });
    saveEligibleCache(eligible);
    report.verifiedEligible = eligible.length;
    console.log(`Eligible long-form official sets: ${eligible.length}`);
  }

  let catalog = allCatalogArtists();
  console.log(`Catalog artists available for matching: ${catalog.length}`);
  const youtubeOwners = new Map<string, string>();
  for (const a of catalog) {
    for (const s of loadExpansion(a.slug).sets) {
      if (!youtubeOwners.has(s.youtubeId)) youtubeOwners.set(s.youtubeId, a.slug);
    }
  }

  const newArtists: NewArtistSeed[] = existsSync(NEW_ARTISTS_PATH)
    ? (JSON.parse(readFileSync(NEW_ARTISTS_PATH, "utf8")) as NewArtistSeed[])
    : [];
  const newBySlug = new Map(newArtists.map((a) => [a.slug, a]));
  const reintroduce = new Set<string>();

  // ── Phase 1: attach sets to existing catalog artists (no Spotify) ──
  console.log("Phase 1: catalog matching…");
  const unmatchedBranded = new Map<string, EligibleSet[]>(); // fold(name) -> sets
  let i = 0;
  for (const d of eligible) {
    i++;
    if (i % 500 === 0) {
      console.log(`  catalog pass ${i}/${eligible.length} (added ${report.setsAdded.length})`);
    }

    const parsed = parseHorArtistName(d.title);
    if (!parsed) {
      report.setsSkipped.push({
        youtubeId: d.id,
        title: d.title,
        reason: "could not parse artist from title",
      });
      continue;
    }

    const artist = findCatalogMatch(parsed, catalog, d.title);
    if (!artist) {
      if (hasOfficialHorBranding(d.title)) {
        const keyName = fold(parsed);
        const list = unmatchedBranded.get(keyName) ?? [];
        list.push(d);
        unmatchedBranded.set(keyName, list);
      } else {
        report.skippedArtists.push({
          name: parsed,
          reason: "no catalog match; livestream slot only (no new-artist create)",
        });
        report.setsSkipped.push({
          youtubeId: d.id,
          title: d.title,
          reason: `no catalog match for "${parsed}"`,
        });
      }
      continue;
    }

    attachSet(d, artist, catalog, youtubeOwners, reintroduce, report);
  }
  console.log(
    `Phase 1 done: ${report.setsAdded.length} sets attached, ${unmatchedBranded.size} unique unmatched branded artists`,
  );

  // ── Phase 2: verify + create new artists for unmatched branded titles ──
  const skipNew = process.env.HOR_SKIP_NEW_ARTISTS === "1";
  if (skipNew) {
    console.log("Phase 2 skipped (HOR_SKIP_NEW_ARTISTS=1)");
    for (const [, sets] of unmatchedBranded) {
      const parsed = parseHorArtistName(sets[0].title);
      for (const d of sets) {
        report.setsSkipped.push({
          youtubeId: d.id,
          title: d.title,
          reason: `deferred new-artist resolve for "${parsed}"`,
        });
      }
      if (parsed) {
        report.skippedArtists.push({
          name: parsed,
          reason: "deferred (HOR_SKIP_NEW_ARTISTS=1)",
        });
      }
    }
  } else {
  console.log("Phase 2: verifying new artists via Spotify…");
  // Prioritize artists with the most official HÖR appearances
  const unmatchedSorted = [...unmatchedBranded.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  const newArtistLimit = process.env.HOR_NEW_ARTIST_LIMIT
    ? parseInt(process.env.HOR_NEW_ARTIST_LIMIT, 10)
    : unmatchedSorted.length;
  let resolved = 0;
  let consecutive429 = 0;
  for (const [, sets] of unmatchedSorted) {
    if (resolved >= newArtistLimit) {
      console.log(`Phase 2 capped at HOR_NEW_ARTIST_LIMIT=${newArtistLimit}`);
      break;
    }
    if (consecutive429 >= 5) {
      console.log(
        "Phase 2 aborted: Spotify rate-limited (5 consecutive 429s). Resume later.",
      );
      writeFileSync(
        ".tmp/hor-unmatched-queue.json",
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            note: "Aborted due to Spotify 429 — remaining unmatched at stop",
            remaining: unmatchedSorted.length - resolved,
          },
          null,
          2,
        ),
      );
      break;
    }
    const parsed = parseHorArtistName(sets[0].title);
    if (!parsed) continue;
    resolved++;
    if (resolved % 25 === 0) {
      console.log(
        `  resolve ${resolved}/${unmatchedBranded.size} (created ${report.artistsCreated.length})`,
      );
      writeFileSync(".tmp/hor-archive-result.json", JSON.stringify(report, null, 2));
    }

    // Already created this run?
    let artist = findCatalogMatch(parsed, catalog, sets[0].title);
    if (!artist) {
      console.log(`  resolve new artist: ${parsed} (${sets.length} sets)`);
      await sleep(1200); // Spotify rate limit — conservative after prior 429s
      let result = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        result = await resolveNewArtist(parsed, catalog, newBySlug, report);
        const last = report.skippedArtists[report.skippedArtists.length - 1];
        const is429 = last?.name === parsed && /429/.test(last.reason);
        if (!is429) break;
        // undo skip entry for retry
        report.skippedArtists.pop();
        const wait = 5000 * (attempt + 1);
        console.log(`  Spotify 429 — backing off ${wait}ms`);
        await sleep(wait);
      }
      if (!result) {
        const last = report.skippedArtists[report.skippedArtists.length - 1];
        if (last?.name === parsed && /429/.test(last.reason)) consecutive429++;
        else consecutive429 = 0;
        for (const d of sets) {
          report.setsSkipped.push({
            youtubeId: d.id,
            title: d.title,
            reason: `could not verify new artist "${parsed}"`,
          });
        }
        continue;
      }
      consecutive429 = 0;
      const alreadyInCatalog = catalog.some((c) => c.slug === result.artist.slug);
      if (!alreadyInCatalog && !newBySlug.has(result.seed.slug)) {
        newBySlug.set(result.seed.slug, result.seed);
        newArtists.push(result.seed);
        report.artistsCreated.push(result.seed);
        writeFileSync(NEW_ARTISTS_PATH, `${JSON.stringify(newArtists, null, 2)}\n`);
        writeHorBerlinSeedsTs(newArtists);
        ensureAllTsImportsHorSeeds();
      }
      artist = result.artist;
      if (!catalog.some((c) => c.slug === artist.slug)) catalog.push(artist);
    }

    for (const d of sets) {
      attachSet(d, artist, catalog, youtubeOwners, reintroduce, report);
    }
  }
  } // end skipNew else

  writeFileSync(NEW_ARTISTS_PATH, `${JSON.stringify(newArtists, null, 2)}\n`);
  writeHorBerlinSeedsTs(newArtists);
  ensureAllTsImportsHorSeeds();

  report.artistsReintroduced = [...reintroduce];
  reintroduceArtists([...reintroduce]);

  const md = [
    "# HÖR Berlin Complete Archive Ingestion",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Official uploads listed | ${report.uploadsListed} |`,
    `| Eligible long-form sets | ${report.verifiedEligible} |`,
    `| Sets added this run | ${report.setsAdded.length} |`,
    `| Sets skipped | ${report.setsSkipped.length} |`,
    `| Artists created | ${report.artistsCreated.length} |`,
    `| Artists reintroduced | ${report.artistsReintroduced.length} |`,
    `| Track fill batches | ${report.tracksAdded.length} |`,
    `| Duplicates avoided | ${report.duplicatesAvoided} |`,
    `| Verification failures | ${report.verificationFailures.length} |`,
    `| Artists skipped | ${[...new Map(report.skippedArtists.map((s) => [s.name, s])).values()].length} |`,
    `| Playback files touched | **0** |`,
    "",
    "## Sets added (sample)",
    "",
    ...report.setsAdded.slice(0, 200).map((s) => `- **${s.slug}** \`${s.youtubeId}\` — ${s.title}`),
    report.setsAdded.length > 200 ? `\n_…and ${report.setsAdded.length - 200} more_` : "",
    "",
    "## Artists created",
    "",
    ...(report.artistsCreated.length
      ? report.artistsCreated.map(
          (a) =>
            `- **${a.name}** (\`${a.slug}\`) Spotify \`${a.spotifyArtistId}\` · followers ${a.followers} · pop ${a.popularity}`,
        )
      : ["_None_"]),
    "",
    "## Artists reintroduced from authenticity-removals",
    "",
    ...(report.artistsReintroduced.length
      ? report.artistsReintroduced.map((s) => `- ${s}`)
      : ["_None_"]),
    "",
    "## Skipped artists (sample)",
    "",
    ...[...new Map(report.skippedArtists.map((s) => [s.name, s])).values()]
      .slice(0, 120)
      .map((s) => `- **${s.name}**: ${s.reason}`),
    "",
  ].join("\n");

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(REPORT_PATH, md, "utf8");
  writeFileSync(".tmp/hor-archive-result.json", JSON.stringify(report, null, 2));

  console.log(`\nDone. Added ${report.setsAdded.length} sets, created ${report.artistsCreated.length} artists`);
  console.log(`Report → ${REPORT_PATH}`);
}

function attachSet(
  d: EligibleSet,
  artist: CatalogArtist,
  _catalog: CatalogArtist[],
  youtubeOwners: Map<string, string>,
  reintroduce: Set<string>,
  report: Report,
): void {
  if (AUTHENTICITY_REMOVED_SLUGS.has(artist.slug)) {
    reintroduce.add(artist.slug);
  }

  const owner = youtubeOwners.get(d.id);
  if (owner && owner !== artist.slug) {
    report.duplicatesAvoided++;
    report.setsSkipped.push({
      youtubeId: d.id,
      title: d.title,
      reason: `duplicate owned by ${owner}`,
    });
    return;
  }

  const exp = loadExpansion(artist.slug);
  if (exp.sets.some((s) => s.youtubeId === d.id)) {
    report.duplicatesAvoided++;
    return;
  }

  if (!artist.spotifyArtistId && exp.tracks.length < 1) {
    report.setsSkipped.push({
      youtubeId: d.id,
      title: d.title,
      reason: `artist ${artist.slug} missing Spotify ID/tracks`,
    });
    return;
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
  report.setsAdded.push({ slug: artist.slug, youtubeId: d.id, title: d.title });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
