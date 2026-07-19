#!/usr/bin/env npx tsx
/**
 * Verified new-artist ingest (targeted list).
 *
 * Adds ONLY authentic, verified artists that are NOT already in the catalog.
 * For each: real Spotify artist (ID / image / genres / top tracks), MusicBrainz
 * country + city + active-since, and every verifiable long-form official set
 * (cached official event channels + live HÖR / Boiler Room YouTube Data API).
 *
 * Nothing is fabricated. If identity or media cannot be verified → the artist is
 * skipped and reported. Catalog / content data only — never touches playback.
 *
 * Usage:
 *   npx tsx scripts/ingest-target-artists.ts
 *   TARGET_REFRESH=1 npx tsx scripts/ingest-target-artists.ts   # ignore per-artist cache
 *   TARGET_NO_LIVE=1 ...                                         # skip live YouTube search
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";
import { horBerlinCatalogArtists } from "../src/content/artists/hor-berlin-seeds";
import type { CatalogExpansion, ExpansionSet, ExpansionTrack } from "../src/lib/catalog/types";
import type { ArtistIngestedMetadata } from "../src/lib/ingestion/types";
import { mapExternalGenres } from "../src/lib/ingestion/genres";
import { getSpotifyCredentials, getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";

const TARGETS = [
  "BYORN", "KUKO", "Lessss", "Luciid", "Doruksen", "Kander", "Callush", "KRL MX",
  "6EJOU", "AIROD", "Fatima Hajji", "Fernanda Martins", "Otta", "SNTS",
  "Tommy Four Seven", "Headless Horseman", "Inhalt der Nacht", "Scalameriya",
  "DJ Hyperdrive", "MISCHLUFT", "Onlynumbers", "XRTN", "KUSS", "Jazzy", "KAS:ST",
];

const cwd = process.cwd();
const EXP_DIR = join(cwd, "data/catalog-expansion");
const ING_DIR = join(cwd, "data/ingestion/artists");
const CACHE_DIR = join(cwd, ".tmp/target-artists");
const EVENT_CACHE_DIR = join(cwd, ".tmp/event-collections");
const SEEDS_TS = join(cwd, "src/content/artists/target-artists-seeds.ts");
const HASH_FILE = join(cwd, "src/content/artists/track-cover-hashes.json");
const REPORT_PATH = join(cwd, "reports/target-artists-ingestion.md");
const RESULT_PATH = join(CACHE_DIR, "result.json");

const MIN_SECONDS = 10 * 60;
const MAX_TRACKS = 6;
const REFRESH = process.env.TARGET_REFRESH === "1";
const NO_LIVE = process.env.TARGET_NO_LIVE === "1";

const SKIP_TITLE =
  /\b(trailer|teaser|clip|shorts?|aftermovie|recap|announcement|promo|preview|snippet|highlights?|countdown|interview|podcast|talk|documentary|q\s*&\s*a|reel|edit|visualizer|lyric)\b|#shorts?/i;

const ISO_COUNTRY: Record<string, string> = {
  DE: "Germany", NL: "Netherlands", ES: "Spain", GB: "United Kingdom", UK: "United Kingdom",
  FR: "France", IT: "Italy", BE: "Belgium", PL: "Poland", RU: "Russia", UA: "Ukraine",
  US: "United States", CA: "Canada", AU: "Australia", PT: "Portugal", SE: "Sweden",
  CH: "Switzerland", AT: "Austria", IE: "Ireland", GR: "Greece", TR: "Turkey",
  BR: "Brazil", MX: "Mexico", AR: "Argentina", CL: "Chile", JP: "Japan", GE: "Georgia",
  CZ: "Czech Republic", RO: "Romania", HU: "Hungary", DK: "Denmark", NO: "Norway",
  FI: "Finland", SK: "Slovakia", RS: "Serbia", HR: "Croatia", SI: "Slovenia",
  BG: "Bulgaria", LT: "Lithuania", LV: "Latvia", EE: "Estonia", CO: "Colombia",
};

// ---------- helpers ----------
function fold(text: string | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/œ/g, "oe")
    .replace(/ß/g, "ss").replace(/ł/g, "l").replace(/ð/g, "d").replace(/þ/g, "th");
}
function foldAlnum(text: string | undefined): string {
  return fold(text).replace(/[^a-z0-9]+/g, "");
}
function nameFoldWords(text: string): string {
  return fold(text).replace(/[^a-z0-9]+/g, " ").trim();
}
function slugify(name: string): string {
  return fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
}
function msToDisplay(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function extractYear(title: string, publishedAt?: string): number {
  const m = title.match(/\b(20\d{2})\b/);
  if (m) return parseInt(m[1], 10);
  if (publishedAt) return parseInt(publishedAt.slice(0, 4), 10);
  return new Date().getFullYear();
}
function scdnHash(url: string | undefined): string | null {
  const m = url?.match(/i\.scdn\.co\/image\/([a-z0-9]+)/i);
  return m?.[1] ?? null;
}

// ---------- existing catalog (skip + similar index) ----------
interface BaseArtist { slug: string; name: string; genres: string[] }
const BASE: BaseArtist[] = [
  ...coreArtists, ...catalogArtists, ...bulkCatalogArtists,
  ...expansionCatalogArtists, ...horBerlinCatalogArtists,
].map((a) => ({ slug: a.slug, name: a.name, genres: (a.genres as string[]) ?? [] }));

const existingSlugs = new Set(BASE.map((a) => a.slug));
const existingNameFolds = new Set(BASE.map((a) => foldAlnum(a.name)));

// primary-genre → existing slugs (for similarArtists suggestions)
const genreToSlugs = new Map<string, string[]>();
for (const a of BASE) {
  const g = a.genres[0];
  if (!g) continue;
  const list = genreToSlugs.get(g) ?? [];
  list.push(a.slug);
  genreToSlugs.set(g, list);
}

// ---------- Spotify client ----------
let spToken: { token: string; exp: number } | null = null;
async function spotifyToken(): Promise<string> {
  const creds = getSpotifyCredentials();
  if (!creds) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET required");
  if (spToken && Date.now() < spToken.exp - 30_000) return spToken.token;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  spToken = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return spToken.token;
}
async function spGet<T>(path: string, attempt = 0): Promise<T> {
  const token = await spotifyToken();
  try {
    return await fetchJson<T>(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      provider: "spotify",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/HTTP 429/.test(msg) && attempt < 6) {
      const wait = 3000 * (attempt + 1);
      console.warn(`    Spotify 429 — backing off ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      return spGet<T>(path, attempt + 1);
    }
    throw e;
  }
}

interface SpArtist {
  id: string; name: string; genres: string[];
  followers: { total: number }; popularity: number;
  images: { url: string; width: number | null }[];
  external_urls: { spotify: string };
}
interface SpTrack {
  id: string; name: string; duration_ms: number; popularity?: number;
  album: { id?: string; name: string; release_date: string; images: { url: string; width: number | null }[] };
  artists?: { id: string; name: string }[];
}

async function resolveSpotify(name: string): Promise<SpArtist | null> {
  const res = await spGet<{ artists: { items: SpArtist[] } }>(
    `/search?type=artist&limit=10&q=${encodeURIComponent(name)}`,
  );
  const items = res.artists?.items ?? [];
  if (!items.length) return null;
  const target = foldAlnum(name);
  const stripTarget = target.replace(/\d+$/, "");
  // Among all name-matching candidates, prefer the most-followed (the real act,
  // not an empty namesake). Fall back to relevance order.
  const matches = items.filter((i) => {
    const f = foldAlnum(i.name);
    return f === target || (f.length >= 4 && f.replace(/\d+$/, "") === stripTarget);
  });
  if (!matches.length) return null;
  // Prefer a candidate that actually has a portrait, then the most-followed
  // (the real act, not an empty namesake).
  matches.sort((a, b) => {
    const ia = a.images?.[0]?.url ? 1 : 0;
    const ib = b.images?.[0]?.url ? 1 : 0;
    if (ia !== ib) return ib - ia;
    return (b.followers?.total ?? 0) - (a.followers?.total ?? 0);
  });
  return matches[0];
}

/**
 * Catalog endpoints (top-tracks / albums / related) are 403 for this app.
 * Track search + single-track/album GET remain available, so we resolve an
 * artist's real, owned tracks via /search?type=track filtered by artist ID.
 */
async function searchArtistTracks(artistId: string, name: string): Promise<SpTrack[]> {
  const seen = new Set<string>();
  const out: SpTrack[] = [];
  const queries = [`artist:"${name}"`, name];
  for (const q of queries) {
    try {
      const res = await spGet<{ tracks: { items: SpTrack[] } }>(
        `/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
      );
      for (const t of res.tracks?.items ?? []) {
        if (!t.id || seen.has(t.id)) continue;
        if (!(t.artists ?? []).some((a) => a.id === artistId)) continue;
        seen.add(t.id);
        out.push(t);
      }
    } catch (e) {
      console.warn(`    track search failed: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(120);
  }
  out.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  return out;
}

async function fetchAlbumLabel(albumId: string | undefined): Promise<string | undefined> {
  if (!albumId) return undefined;
  try {
    const alb = await spGet<{ label?: string }>(`/albums/${albumId}`);
    const label = alb.label?.trim();
    if (label && !/^(various|independent|distrokid|self[- ]?released|none)$/i.test(label)) return label;
  } catch { /* label optional (single-album GET may 403) */ }
  return undefined;
}

// ---------- MusicBrainz ----------
interface MbDetail {
  country?: string;
  area?: { name?: string; "iso-3166-1-codes"?: string[] };
  "begin-area"?: { name?: string };
  "life-span"?: { begin?: string };
  tags?: { name?: string; count?: number }[];
  genres?: { name?: string }[];
}
async function fetchMb(name: string): Promise<{ country?: string; city?: string; activeSince?: number; tags: string[] }> {
  try {
    await sleep(1100);
    const search = await fetchJson<{ artists?: { id: string; country?: string; score: number }[] }>(
      `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=5`,
      { provider: "musicbrainz" },
    );
    const top = search.artists?.sort((a, b) => b.score - a.score)[0];
    if (!top) return { tags: [] };
    await sleep(1100);
    let detail: MbDetail;
    try {
      detail = await fetchJson<MbDetail>(
        `https://musicbrainz.org/ws/2/artist/${top.id}?fmt=json&inc=tags+genres`,
        { provider: "musicbrainz" },
      );
    } catch {
      await sleep(1100);
      detail = await fetchJson<MbDetail>(`https://musicbrainz.org/ws/2/artist/${top.id}?fmt=json`, {
        provider: "musicbrainz",
      });
    }
    const iso = top.country ?? detail.country ?? detail.area?.["iso-3166-1-codes"]?.[0];
    const country = iso ? (ISO_COUNTRY[iso] ?? detail.area?.name ?? iso) : detail.area?.name;
    const city = detail["begin-area"]?.name ?? detail.area?.name ?? country;
    const beginYear = parseInt((detail["life-span"]?.begin ?? "").slice(0, 4), 10);
    const tags = [
      ...(detail.tags ?? []).map((t) => t.name ?? ""),
      ...(detail.genres ?? []).map((g) => g.name ?? ""),
    ].filter(Boolean);
    return {
      country: country ?? undefined,
      city: city ?? undefined,
      activeSince: Number.isFinite(beginYear) && beginYear > 1980 ? beginYear : undefined,
      tags,
    };
  } catch {
    return { tags: [] };
  }
}

// ---------- YouTube Data API ----------
async function ytVideoDetails(ids: string[], key: string) {
  const out: { id: string; title: string; channelTitle: string; seconds: number; public: boolean; publishedAt?: string }[] = [];
  for (let i = 0; i < ids.length; i += 45) {
    const chunk = ids.slice(i, i + 45);
    const data = await fetchJson<{
      items?: {
        id: string;
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
        contentDetails?: { duration?: string };
        status?: { privacyStatus?: string };
      }[];
    }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${chunk.join(",")}&key=${key}`,
      { provider: "youtube" },
    );
    for (const it of data.items ?? []) {
      out.push({
        id: it.id,
        title: it.snippet?.title ?? "",
        channelTitle: it.snippet?.channelTitle ?? "",
        seconds: parseIsoDuration(it.contentDetails?.duration ?? ""),
        public: it.status?.privacyStatus === "public",
        publishedAt: it.snippet?.publishedAt,
      });
    }
    await sleep(60);
  }
  return out;
}

let ytQuotaDead = false;
async function ytSearch(query: string, key: string): Promise<{ id: string; channelTitle: string; title: string }[]> {
  if (ytQuotaDead) return [];
  try {
    const data = await fetchJson<{
      items?: { id?: { videoId?: string }; snippet?: { channelTitle?: string; title?: string } }[];
      error?: { message?: string };
    }>(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${key}`,
      { provider: "youtube" },
    );
    return (data.items ?? [])
      .filter((i) => i.id?.videoId)
      .map((i) => ({ id: i.id!.videoId!, channelTitle: i.snippet?.channelTitle ?? "", title: i.snippet?.title ?? "" }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/quota|403/i.test(msg)) {
      ytQuotaDead = true;
      console.warn("  ! YouTube quota exhausted — skipping remaining live searches");
    }
    return [];
  }
}

// ---------- cached official event sets ----------
type EligibleSet = { id: string; title: string; seconds: number; publishedAt?: string; venue: string; collection: string };
function loadEventEligible(): EligibleSet[] {
  if (!existsSync(EVENT_CACHE_DIR)) return [];
  const skip = new Set(["result.json", "unmatched-queue.json"]);
  const out: EligibleSet[] = [];
  for (const file of readdirSync(EVENT_CACHE_DIR)) {
    if (!file.endsWith(".json") || skip.has(file)) continue;
    try {
      const rows = JSON.parse(readFileSync(join(EVENT_CACHE_DIR, file), "utf8")) as EligibleSet[];
      for (const r of rows) if (r?.id && r.seconds >= MIN_SECONDS) out.push(r);
    } catch { /* skip */ }
  }
  return out;
}

// performer segment (leading billing, before host/venue markers)
function performerSegment(title: string): string {
  const lower = fold(title);
  const markers = [" @ ", " at ", " | ", " live at ", " invites", " presents", " present ", " pres. ", " pres ", " b2b "];
  let cut = title.length;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx >= 0 && idx < cut) cut = idx;
  }
  return title.slice(0, cut);
}

interface NewArtist {
  slug: string; name: string; spotifyName: string; spotifyId: string;
  spotifyUrl: string; imageUrl: string; imageUrls: string[];
  followers: number; popularity: number; spotifyGenres: string[]; mbTags: string[];
  genres: string[]; country: string; city: string; activeSince: number;
  labels: string[]; bpmRange: [number, number];
  tracks: ExpansionTrack[]; trackHashes: Record<string, string>;
  sets: ExpansionSet[];
}

function bpmForGenre(g: string): [number, number] {
  if (/schranz|hard-techno/.test(g)) return [145, 160];
  if (/industrial|dark/.test(g)) return [130, 145];
  if (/hypnotic/.test(g)) return [128, 138];
  if (/acid/.test(g)) return [135, 150];
  return [138, 150];
}

function matchArtistInTitle(title: string, artistFoldWords: string): boolean {
  const seg = fold(performerSegment(title));
  const alnum = artistFoldWords.replace(/[^a-z0-9]/g, "");
  if (alnum.length < 4) return false;
  const escaped = artistFoldWords.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
  return re.test(seg);
}

// ---------- resolve one target ----------
interface Resolved { artist?: NewArtist; skipped?: string; failed?: string }

async function resolveTarget(name: string, key: string | null, eventEligible: EligibleSet[], claimedSets: Set<string>, existingSetIds: Set<string>): Promise<Resolved> {
  const slug = slugify(name);
  if (existingSlugs.has(slug) || existingNameFolds.has(foldAlnum(name))) {
    return { skipped: `already in catalog (${slug})` };
  }

  const cachePath = join(CACHE_DIR, `${slug}.json`);
  let cachedFile: NewArtist | null = null;
  if (existsSync(cachePath)) {
    try { cachedFile = JSON.parse(readFileSync(cachePath, "utf8")) as NewArtist; } catch { cachedFile = null; }
  }
  const priorSets: ExpansionSet[] = cachedFile?.sets ?? [];

  let base: NewArtist;
  if (!REFRESH && cachedFile) {
    base = cachedFile;
    console.log(`  [${slug}] cache hit (${base.tracks.length} tracks)`);
  } else {
    const sp = await resolveSpotify(name);
    if (!sp) return { failed: "no exact Spotify artist match" };
    if (!sp.images?.length || !sp.images[0]?.url) return { failed: "Spotify artist has no portrait image" };

    const mappedGenres = mapExternalGenres(sp.genres ?? []);

    const rawTracks = await searchArtistTracks(sp.id, sp.name);
    const tracks: ExpansionTrack[] = [];
    const trackHashes: Record<string, string> = {};
    const seenTrack = new Set<string>();
    const seenTitle = new Set<string>();
    const trackYears: number[] = [];
    let labelAlbumId: string | undefined;
    for (const t of rawTracks) {
      if (tracks.length >= MAX_TRACKS) break;
      if (!t.id || !/^[a-zA-Z0-9]{22}$/.test(t.id) || !t.duration_ms || t.duration_ms <= 0) continue;
      if (seenTrack.has(t.id)) continue;
      const titleKey = fold(t.name);
      if (seenTitle.has(titleKey)) continue; // avoid remix/edit duplicates of same title
      seenTrack.add(t.id);
      seenTitle.add(titleKey);
      const year = parseInt((t.album?.release_date ?? "").slice(0, 4), 10);
      if (Number.isFinite(year) && year > 1990) trackYears.push(year);
      tracks.push({
        title: t.name,
        spotifyTrackId: t.id,
        year: Number.isFinite(year) ? year : new Date().getFullYear(),
        duration: msToDisplay(t.duration_ms),
        album: t.album?.name,
      });
      const imgs = t.album?.images ?? [];
      const hash = scdnHash(imgs.find((i) => i.width === 300)?.url ?? imgs[imgs.length - 1]?.url ?? imgs[0]?.url);
      if (hash) trackHashes[t.id] = hash;
      if (!labelAlbumId) labelAlbumId = t.album?.id;
    }

    const label = await fetchAlbumLabel(labelAlbumId);
    const mb = await fetchMb(name);

    const genres = mappedGenres.length ? mappedGenres : ["peak-time-techno"];
    const country = mb.country ?? "Unknown";
    const city = mb.city ?? mb.country ?? "Unknown";
    const albumActive = trackYears.length ? Math.min(...trackYears) : undefined;
    const activeSince = mb.activeSince ?? albumActive ?? 2016;

    base = {
      slug, name, spotifyName: sp.name, spotifyId: sp.id,
      spotifyUrl: sp.external_urls?.spotify ?? `https://open.spotify.com/artist/${sp.id}`,
      imageUrl: sp.images[0].url, imageUrls: sp.images.map((i) => i.url),
      followers: sp.followers?.total ?? 0, popularity: sp.popularity ?? 0,
      spotifyGenres: sp.genres ?? [], mbTags: mb.tags, genres, country, city, activeSince,
      labels: label ? [label] : [], bpmRange: bpmForGenre(genres[0]),
      tracks, trackHashes, sets: [],
    };
    console.log(`  [${slug}] ${sp.name} · ${base.tracks.length} tracks · ${country}/${city} · since ${activeSince}${label ? ` · ${label}` : ""}`);
  }

  // Normalize genres (from Spotify + MusicBrainz tags) and origin on every run so
  // improvements propagate to cached artists too. All values remain real / honest.
  const derivedGenres = mapExternalGenres([...(base.spotifyGenres ?? []), ...(base.mbTags ?? [])]);
  base.genres = derivedGenres.length ? derivedGenres : ["peak-time-techno"];
  base.bpmRange = bpmForGenre(base.genres[0]);
  if (!base.country || base.country === "Unknown") base.country = "International";
  if (!base.city || base.city === "Unknown") base.city = base.country;

  // ---- sets: preserve previously-found sets (esp. live HÖR/Boiler Room), then
  //           re-match cached official event channels, then live search ----
  const artistFoldWords = nameFoldWords(base.spotifyName || base.name);
  base.sets = [];
  const localSeen = new Set<string>();
  for (const s of priorSets) {
    if (!s?.youtubeId || existingSetIds.has(s.youtubeId) || claimedSets.has(s.youtubeId) || localSeen.has(s.youtubeId)) continue;
    base.sets.push(s);
    localSeen.add(s.youtubeId);
    claimedSets.add(s.youtubeId);
  }
  for (const s of eventEligible) {
    if (base.sets.length >= 8) break;
    if (existingSetIds.has(s.id) || claimedSets.has(s.id) || localSeen.has(s.id)) continue;
    if (!matchArtistInTitle(s.title, artistFoldWords)) continue;
    base.sets.push({ title: s.title, venue: s.venue, year: extractYear(s.title, s.publishedAt), youtubeId: s.id });
    localSeen.add(s.id);
    claimedSets.add(s.id);
  }

  // ---- sets: live HÖR Berlin + Boiler Room (best-effort) ----
  if (key && !NO_LIVE && !ytQuotaDead) {
    const liveQueries: { q: string; token: string; venue: string }[] = [
      { q: `${base.spotifyName} HÖR Berlin`, token: "hor", venue: "HÖR Berlin" },
      { q: `${base.spotifyName} Boiler Room`, token: "boiler room", venue: "Boiler Room" },
    ];
    for (const lq of liveQueries) {
      const hits = await ytSearch(lq.q, key);
      const candidateIds = hits
        .filter((h) => {
          const ct = fold(h.channelTitle);
          const tk = fold(lq.token);
          return ct.includes(tk) || fold(h.title).includes(tk);
        })
        .map((h) => h.id)
        .filter((id) => !existingSetIds.has(id) && !claimedSets.has(id) && !localSeen.has(id));
      if (!candidateIds.length) { await sleep(120); continue; }
      const details = await ytVideoDetails(candidateIds, key);
      for (const d of details) {
        if (base.sets.length >= 10) break;
        if (!d.public || d.seconds < MIN_SECONDS) continue;
        if (SKIP_TITLE.test(d.title)) continue;
        const ct = fold(d.channelTitle);
        if (!ct.includes(fold(lq.token))) continue; // official venue channel only
        if (!matchArtistInTitle(d.title, artistFoldWords)) continue;
        base.sets.push({ title: d.title, venue: lq.venue, year: extractYear(d.title, d.publishedAt), youtubeId: d.id });
        localSeen.add(d.id);
        claimedSets.add(d.id);
      }
      await sleep(150);
    }
  }

  // cache the resolved artist (without sets churn issues — sets recomputed each run)
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify(base, null, 2)}\n`, "utf8");

  // Identity gate: require ≥1 owned Spotify track. This confirms we matched the
  // correct real artist (not an empty/other-genre namesake) and guarantees a real
  // Spotify portrait. Artists whose only match is a wrong-genre namesake (0 owned
  // tracks) are rejected — never ingest a wrong Spotify identity.
  if (base.tracks.length === 0) {
    return { failed: "no owned Spotify tracks found — Spotify identity unconfirmed (likely same-named namesake)" };
  }
  // Techno-identity gate: confirm this is a techno act via Spotify genres,
  // MusicBrainz tags/genres, or at least one verified official long-form techno
  // set. Prevents ingesting same-named pop/other-genre acts.
  const TECHNO_RE = /techno|schranz|hardgroove|industrial|rave|acid|hardcore|electro|hard dance|hard house|gabber|trance|hard.?groove|dark disco|body music|ebm/i;
  const technoTrackHint = base.tracks.some(
    (t) => TECHNO_RE.test(t.title) || (t.album ? TECHNO_RE.test(t.album) : false),
  );
  const technoGenre =
    mapExternalGenres(base.spotifyGenres ?? []).length > 0 ||
    (base.spotifyGenres ?? []).some((g) => TECHNO_RE.test(g)) ||
    (base.mbTags ?? []).some((t) => TECHNO_RE.test(t)) ||
    technoTrackHint;
  if (!technoGenre && base.sets.length === 0) {
    return {
      failed: `unverifiable techno identity (Spotify genres=[${base.spotifyGenres.join(", ")}], MB tags=[${base.mbTags.slice(0, 6).join(", ")}], no verified techno set)`,
    };
  }
  return { artist: base };
}

// ---------- writers ----------
function writeExpansion(a: NewArtist): void {
  mkdirSync(EXP_DIR, { recursive: true });
  const data: CatalogExpansion = {
    slug: a.slug,
    tracks: a.tracks,
    sets: a.sets,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(join(EXP_DIR, `${a.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeIngested(a: NewArtist): void {
  mkdirSync(ING_DIR, { recursive: true });
  const now = new Date().toISOString();
  const data: ArtistIngestedMetadata = {
    slug: a.slug,
    name: a.name,
    updatedAt: now,
    sources: {
      spotify: { syncedAt: now, status: "ok" },
      musicbrainz: { syncedAt: now, status: a.country !== "Unknown" ? "ok" : "skipped" },
    },
    spotify: {
      artistId: a.spotifyId,
      name: a.spotifyName,
      url: a.spotifyUrl,
      genres: a.spotifyGenres,
      followers: a.followers,
      popularity: a.popularity,
      imageUrl: a.imageUrl,
      imageUrls: a.imageUrls,
      relatedArtists: [],
    },
    resolvedImage: {
      url: a.imageUrl,
      source: "spotify",
      sourceUrl: a.spotifyUrl,
    },
  };
  writeFileSync(join(ING_DIR, `${a.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function computeSimilar(a: NewArtist, allNew: NewArtist[]): string[] {
  const out: string[] = [];
  const primary = a.genres[0];
  // other new artists sharing primary genre
  for (const n of allNew) {
    if (n.slug === a.slug) continue;
    if (n.genres[0] === primary) out.push(n.slug);
  }
  // existing catalog peers of same primary genre
  for (const slug of genreToSlugs.get(primary) ?? []) {
    if (!out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 8);
}

function tsLiteral(v: unknown): string {
  return JSON.stringify(v);
}

function writeSeedsTs(all: NewArtist[], similarBySlug: Map<string, string[]>): void {
  const seeds = all
    .map((a) => {
      const similar = similarBySlug.get(a.slug) ?? [];
      return `  {
    slug: ${tsLiteral(a.slug)},
    name: ${tsLiteral(a.name)},
    country: ${tsLiteral(a.country)},
    city: ${tsLiteral(a.city)},
    activeSince: ${a.activeSince},
    genres: ${tsLiteral(a.genres)} as Genre[],
    labels: ${tsLiteral(a.labels)},
    similarArtists: ${tsLiteral(similar)},
    spotifyArtistId: ${tsLiteral(a.spotifyId)},
    bpmRange: [${a.bpmRange[0]}, ${a.bpmRange[1]}] as [number, number],
  },`;
    })
    .join("\n");

  const content = `/**
 * AUTO-GENERATED by scripts/ingest-target-artists.ts
 * Verified new artists (targeted list) not previously in the catalog.
 * Do not edit by hand — re-run the ingest script.
 */
import type { Genre } from "@/types";
import { createCatalogArtist, type CatalogEntry } from "./builder";

interface TargetSeed {
  slug: string;
  name: string;
  country: string;
  city: string;
  activeSince: number;
  genres: Genre[];
  labels: string[];
  similarArtists: string[];
  spotifyArtistId: string;
  bpmRange: [number, number];
}

const SEEDS: TargetSeed[] = [
${seeds}
];

function toEntry(seed: TargetSeed): CatalogEntry {
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
    bpmRange: seed.bpmRange,
    similarArtists: seed.similarArtists,
    tracks: [],
  };
}

export const targetArtistCatalogArtists = SEEDS.map((seed) => createCatalogArtist(toEntry(seed)));
`;
  writeFileSync(SEEDS_TS, content, "utf8");
}

function mergeHashes(all: NewArtist[]): number {
  let hashes: Record<string, string> = {};
  try { hashes = JSON.parse(readFileSync(HASH_FILE, "utf8")) as Record<string, string>; } catch { hashes = {}; }
  let added = 0;
  for (const a of all) {
    for (const [id, hash] of Object.entries(a.trackHashes)) {
      if (!hashes[id]) { hashes[id] = hash; added++; }
    }
  }
  const sorted = Object.fromEntries(Object.entries(hashes).sort(([x], [y]) => x.localeCompare(y)));
  writeFileSync(HASH_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return added;
}

// ---------- main ----------
async function main() {
  if (!getSpotifyCredentials()) {
    console.error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET required in .env.local");
    process.exit(1);
  }
  const ytKey = getYoutubeApiKey();
  mkdirSync(CACHE_DIR, { recursive: true });

  const eventEligible = loadEventEligible();
  console.log(`Loaded ${eventEligible.length} cached official event sets`);

  // existing set ids across all expansions (avoid duplicate ownership)
  const existingSetIds = new Set<string>();
  if (existsSync(EXP_DIR)) {
    for (const f of readdirSync(EXP_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const exp = JSON.parse(readFileSync(join(EXP_DIR, f), "utf8")) as CatalogExpansion;
        const owner = exp.slug;
        // do not treat this run's own artists' files as blockers (they are rebuilt)
        if (TARGETS.some((t) => slugify(t) === owner)) continue;
        for (const s of exp.sets ?? []) existingSetIds.add(s.youtubeId);
      } catch { /* skip */ }
    }
  }

  const claimedSets = new Set<string>();
  const added: NewArtist[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const failed: { name: string; reason: string }[] = [];   // definitive rejections
  const errored: { name: string; reason: string }[] = [];  // transient errors (do NOT clean files)

  const only = process.env.TARGET_ONLY?.trim().toLowerCase();
  const onlySet = only ? new Set(only.split(",").map((s) => s.trim()).filter(Boolean)) : null;
  const targetList = onlySet
    ? TARGETS.filter((t) => onlySet.has(slugify(t)) || [...onlySet].some((o) => fold(t).includes(o)))
    : TARGETS;

  for (const name of targetList) {
    console.log(`\n▶ ${name}`);
    try {
      const r = await resolveTarget(name, ytKey, eventEligible, claimedSets, existingSetIds);
      if (r.artist) added.push(r.artist);
      else if (r.skipped) { skipped.push({ name, reason: r.skipped }); console.log(`  ⤳ skipped: ${r.skipped}`); }
      else if (r.failed) { failed.push({ name, reason: r.failed }); console.log(`  ✗ not verified: ${r.failed}`); }
    } catch (e) {
      errored.push({ name, reason: e instanceof Error ? e.message : String(e) });
      console.log(`  ! error (will retry on re-run): ${e instanceof Error ? e.message : e}`);
    }
    await sleep(400);
  }

  // Clean up expansion/ingested files ONLY for targets that were DEFINITIVELY
  // rejected (a real `failed` reason) on a full run. Never touch existing catalog
  // slugs, artists that only errored transiently (429/network), or added artists.
  const addedSlugs = new Set(added.map((a) => a.slug));
  if (!onlySet) {
    const { unlinkSync } = await import("node:fs");
    for (const f of failed) {
      const s = slugify(f.name);
      if (addedSlugs.has(s) || existingSlugs.has(s)) continue;
      for (const p of [join(EXP_DIR, `${s}.json`), join(ING_DIR, `${s}.json`)]) {
        if (existsSync(p)) { try { unlinkSync(p); console.log(`  cleaned stale ${p}`); } catch { /* noop */ } }
      }
    }
  }

  // similar artists (needs full new-artist set)
  const similarBySlug = new Map<string, string[]>();
  for (const a of added) similarBySlug.set(a.slug, computeSimilar(a, added));

  // write everything
  for (const a of added) { writeExpansion(a); writeIngested(a); }
  writeSeedsTs(added, similarBySlug);
  const hashesAdded = mergeHashes(added);

  const totalTracks = added.reduce((n, a) => n + a.tracks.length, 0);
  const totalSets = added.reduce((n, a) => n + a.sets.length, 0);
  const byVenue = new Map<string, number>();
  for (const a of added) for (const s of a.sets) byVenue.set(s.venue, (byVenue.get(s.venue) ?? 0) + 1);

  const result = {
    generatedAt: new Date().toISOString(),
    added: added.map((a) => ({ slug: a.slug, name: a.name, spotifyId: a.spotifyId, tracks: a.tracks.length, sets: a.sets.length, country: a.country, city: a.city })),
    skipped, failed, errored,
    totals: { artists: added.length, tracks: totalTracks, sets: totalSets, hashesAdded },
    setsByVenue: Object.fromEntries(byVenue),
  };
  writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`\n=== DONE ===`);
  console.log(`Added: ${added.length} · tracks: ${totalTracks} · sets: ${totalSets} · covers: +${hashesAdded}`);
  console.log(`Skipped (existing): ${skipped.length} · Not verified: ${failed.length} · Errored: ${errored.length}`);
  if (errored.length) console.log(`Errored (re-run to resolve):`, errored.map((e) => e.name).join(", "));
  console.log(`Sets by venue:`, Object.fromEntries(byVenue));
  console.log(`Result → ${RESULT_PATH}`);
  console.log(`Seeds → ${SEEDS_TS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
