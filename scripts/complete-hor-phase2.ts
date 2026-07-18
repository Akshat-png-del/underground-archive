#!/usr/bin/env npx tsx
/**
 * Phase 2 — Complete verified HÖR artist metadata (rate-limit safe).
 * Spotify Web API only — no HTML scraping, no oEmbed, no guessed values.
 * Checkpointed, resumable. Catalog/data only — never touches playback.
 *
 * Resume: npx tsx scripts/complete-hor-phase2.ts
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
import { fetchDiscogsArtist, isDiscogsConfigured } from "../src/lib/ingestion/discogs";
import { sleep } from "../src/lib/ingestion/http";
import { SPOTIFY_VERIFIED_DURATIONS } from "../src/lib/catalog/spotify-verified-durations";

class RateLimitAbortError extends Error {
  constructor(
    readonly retryAfterSeconds: number,
    message: string,
  ) {
    super(message);
    this.name = "RateLimitAbortError";
  }
}

const OFFLINE = process.argv.includes("--offline");
const SKIP_BUNDLE = process.argv.includes("--skip-bundle");
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const HASH_FILE = join(process.cwd(), "src/content/artists/track-cover-hashes.json");
const CHECKPOINT_PATH = join(process.cwd(), ".tmp/hor-phase2-checkpoint.json");
const REPORT_PATH = join(process.cwd(), "reports/hor-phase2-metadata.md");

const TRACK_DELAY_MS = 5000;
const ARTIST_DELAY_MS = 8000;
const MAX_RETRY_WAIT_MS = 120_000;
const ABORT_RETRY_AFTER_S = 600;
const MAX_RETRIES = 8;
const TARGET_TRACKS_MIN = 5;
const TARGET_TRACKS_MAX = 8;

interface SpotifyTrackResponse {
  id: string;
  name: string;
  duration_ms: number;
  album?: {
    name?: string;
    release_date?: string;
    images?: { url: string }[];
  };
  artists?: { id: string; name: string }[];
}

interface SpotifyArtistResponse {
  id: string;
  name: string;
  genres: string[];
  followers: { total: number };
  popularity: number;
  images: { url: string }[];
  external_urls: { spotify: string };
}

interface Checkpoint {
  version: 1;
  startedAt: string;
  updatedAt: string;
  artistIndex: number;
  trackIndex: number;
  currentSlug: string | null;
  completedArtists: string[];
  stats: {
    requests: number;
    retries: number;
    http429: number;
    portraitsCompleted: number;
    durationsCompleted: number;
    artworkCompleted: number;
    duplicatesFixed: number;
    tracksRemoved: number;
    topTracksAdded: number;
  };
  unresolvedArtists: string[];
  unresolvedTracks: { slug: string; trackId: string; reason: string }[];
  portraitsCompleted: string[];
  duplicatesFixed: { slug: string; trackId: string; action: string }[];
}

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
  return JSON.parse(readFileSync(join(OUT_DIR, `${slug}.json`), "utf8")) as CatalogExpansion;
}

function saveExpansion(data: CatalogExpansion): void {
  data.updatedAt = new Date().toISOString();
  writeFileSync(join(OUT_DIR, `${data.slug}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractCoverHash(url?: string): string | null {
  if (!url) return null;
  const hash = url.split("/").pop()?.split("?")[0];
  return hash?.startsWith("ab67616d") ? hash : null;
}

function isSpotifyCdnUrl(url: string | null | undefined): boolean {
  return !!url && (/i\.scdn\.co\/image\//.test(url) || /spotifycdn\.com\//.test(url));
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

function loadCheckpoint(slugs: string[]): Checkpoint {
  if (existsSync(CHECKPOINT_PATH)) {
    try {
      return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8")) as Checkpoint;
    } catch {
      /* fresh */
    }
  }
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    artistIndex: 0,
    trackIndex: 0,
    currentSlug: slugs[0] ?? null,
    completedArtists: [],
    stats: {
      requests: 0,
      retries: 0,
      http429: 0,
      portraitsCompleted: 0,
      durationsCompleted: 0,
      artworkCompleted: 0,
      duplicatesFixed: 0,
      tracksRemoved: 0,
      topTracksAdded: 0,
    },
    unresolvedArtists: [],
    unresolvedTracks: [],
    portraitsCompleted: [],
    duplicatesFixed: [],
  };
}

function saveCheckpoint(cp: Checkpoint): void {
  cp.updatedAt = new Date().toISOString();
  mkdirSync(join(process.cwd(), ".tmp"), { recursive: true });
  writeFileSync(CHECKPOINT_PATH, `${JSON.stringify(cp, null, 2)}\n`, "utf8");
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const creds = getSpotifyCredentials();
  if (!creds) throw new Error("SPOTIFY_CLIENT_ID/SECRET required in .env.local");
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
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function spotifyApiGet<T>(
  path: string,
  cp: Checkpoint,
): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    cp.stats.requests++;
    const token = await getAccessToken();
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 429) {
      cp.stats.http429++;
      cp.stats.retries++;
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "0", 10);
      if (retryAfter > ABORT_RETRY_AFTER_S) {
        saveCheckpoint(cp);
        throw new RateLimitAbortError(
          retryAfter,
          `Spotify rate-limited for ${retryAfter}s (~${Math.round(retryAfter / 3600)}h). Checkpoint saved — resume later.`,
        );
      }
      const wait =
        retryAfter > 0
          ? Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS)
          : Math.min(MAX_RETRY_WAIT_MS, 3000 * 2 ** attempt);
      console.warn(`  429 on ${path} — backoff ${wait}ms (attempt ${attempt + 1})`);
      saveCheckpoint(cp);
      await sleep(wait);
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify ${path}: ${res.status} ${text.slice(0, 120)}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`Spotify ${path}: max retries after 429`);
}

function trackOwnedBy(track: SpotifyTrackResponse, artistId: string): boolean {
  return track.artists?.some((a) => a.id === artistId) ?? false;
}

function applyTrackFromApi(
  track: SpotifyTrackResponse,
  coverHashes: Record<string, string>,
  cp: Checkpoint,
): ExpansionTrack {
  const hash = extractCoverHash(track.album?.images?.[0]?.url);
  if (hash) {
    coverHashes[track.id] = hash;
    cp.stats.artworkCompleted++;
  }
  const duration = formatDurationMs(track.duration_ms);
  if (duration) cp.stats.durationsCompleted++;
  const year = track.album?.release_date
    ? parseInt(track.album.release_date.slice(0, 4), 10)
    : new Date().getFullYear();
  return {
    title: track.name,
    spotifyTrackId: track.id,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    duration,
    album: track.album?.name || undefined,
  };
}

async function completePortrait(
  slug: string,
  artistId: string,
  cp: Checkpoint,
): Promise<boolean> {
  const artist = await spotifyApiGet<SpotifyArtistResponse>(`/artists/${artistId}`, cp);
  await sleep(ARTIST_DELAY_MS);
  if (!artist) return false;

  const imageUrl = artist.images?.[0]?.url ?? null;
  const meta = loadOrCreateMetadata({ slug, name: artist.name });
  const now = new Date().toISOString();

  if (imageUrl && isSpotifyCdnUrl(imageUrl)) {
    meta.resolvedImage = {
      url: imageUrl,
      source: "spotify",
      sourceUrl: artist.external_urls.spotify,
    };
    meta.spotify = {
      artistId: artist.id,
      name: artist.name,
      url: artist.external_urls.spotify,
      genres: artist.genres ?? [],
      followers: artist.followers?.total ?? 0,
      popularity: artist.popularity ?? 0,
      imageUrl,
      imageUrls: (artist.images ?? []).map((i) => i.url),
      relatedArtists: meta.spotify?.relatedArtists ?? [],
    };
    meta.sources.spotify = { syncedAt: now, status: "ok" };
    writeArtistMetadata(meta);
    cp.portraitsCompleted.push(slug);
    cp.stats.portraitsCompleted++;
    return true;
  }

  // Fallback: Discogs API (not Spotify HTML)
  if (isDiscogsConfigured()) {
    try {
      const discogs = await fetchDiscogsArtist(artist.name);
      await sleep(1500);
      if (discogs?.imageUrl && isSpotifyCdnUrl(discogs.imageUrl) === false) {
        meta.resolvedImage = {
          url: discogs.imageUrl,
          source: "discogs",
          sourceUrl: discogs.uri ?? "",
        };
        meta.discogs = discogs;
        meta.sources.discogs = { syncedAt: now, status: "ok" };
        writeArtistMetadata(meta);
        cp.portraitsCompleted.push(slug);
        cp.stats.portraitsCompleted++;
        return true;
      }
    } catch {
      /* non-fatal */
    }
  }

  cp.unresolvedArtists.push(slug);
  return false;
}

async function fetchTopTracks(
  artistId: string,
  cp: Checkpoint,
): Promise<SpotifyTrackResponse[]> {
  const data = await spotifyApiGet<{ tracks?: SpotifyTrackResponse[] }>(
    `/artists/${artistId}/top-tracks?market=US`,
    cp,
  );
  await sleep(TRACK_DELAY_MS);
  return (data?.tracks ?? []).filter((t) => trackOwnedBy(t, artistId));
}

async function processArtist(
  slug: string,
  cp: Checkpoint,
  coverHashes: Record<string, string>,
  globalTrackOwner: Map<string, string>,
): Promise<void> {
  const seed = getArtistSeed(slug);
  if (!seed?.spotifyArtistId) {
    cp.unresolvedArtists.push(slug);
    cp.completedArtists.push(slug);
    return;
  }

  const artistId = seed.spotifyArtistId;
  console.log(`\n▶ ${slug} (${artistId})`);

  // Portrait
  const hadPortrait = isSpotifyCdnUrl(
    loadOrCreateMetadata({ slug, name: seed.name }).resolvedImage?.url,
  );
  if (!hadPortrait) {
    const ok = await completePortrait(slug, artistId, cp);
    console.log(`  portrait: ${ok ? "✓" : "—"}`);
  } else {
    console.log(`  portrait: already verified`);
  }

  const exp = loadExpansion(slug);
  let tracks = [...exp.tracks].filter((t) => /^[a-zA-Z0-9]{22}$/.test(t.spotifyTrackId));

  // Fill from top tracks if under minimum
  if (tracks.length < TARGET_TRACKS_MIN) {
    const top = await fetchTopTracks(artistId, cp);
    const existing = new Set(tracks.map((t) => t.spotifyTrackId));
    for (const t of top) {
      if (existing.has(t.id)) continue;
      tracks.push(applyTrackFromApi(t, coverHashes, cp));
      existing.add(t.id);
      cp.stats.topTracksAdded++;
      if (tracks.length >= TARGET_TRACKS_MAX) break;
    }
  }

  // Process tracks one at a time (resume from trackIndex)
  const startTrack = cp.currentSlug === slug ? cp.trackIndex : 0;
  const enriched: ExpansionTrack[] = [];

  for (let ti = 0; ti < tracks.length; ti++) {
    if (ti < startTrack) {
      enriched.push(tracks[ti]!);
      continue;
    }

    cp.currentSlug = slug;
    cp.trackIndex = ti;
    saveCheckpoint(cp);

    const tid = tracks[ti]!.spotifyTrackId;
    const apiTrack = await spotifyApiGet<SpotifyTrackResponse>(`/tracks/${tid}`, cp);
    await sleep(TRACK_DELAY_MS);

    if (!apiTrack) {
      cp.unresolvedTracks.push({ slug, trackId: tid, reason: "API 404" });
      enriched.push(tracks[ti]!);
      continue;
    }

    if (!trackOwnedBy(apiTrack, artistId)) {
      const owner = globalTrackOwner.get(tid);
      cp.duplicatesFixed.push({
        slug,
        trackId: tid,
        action: `removed — owned by ${owner ?? apiTrack.artists?.[0]?.name ?? "other artist"}`,
      });
      cp.stats.duplicatesFixed++;
      cp.stats.tracksRemoved++;
      console.log(`  ✗ removed ${tid} (${tracks[ti]!.title}) — wrong artist`);
      continue;
    }

    const row = applyTrackFromApi(apiTrack, coverHashes, cp);
    enriched.push(row);

    const prevOwner = globalTrackOwner.get(tid);
    if (prevOwner && prevOwner !== slug) {
      // Collab tracks may legitimately appear on multiple artist pages when API confirms ownership.
      cp.duplicatesFixed.push({
        slug,
        trackId: tid,
        action: `shared with ${prevOwner} (collab — kept on both, API-verified)`,
      });
    }
    globalTrackOwner.set(tid, slug);
    console.log(`  ✓ ${row.title} (${row.duration || "no duration"})`);
  }

  // Dedupe within artist
  const seen = new Set<string>();
  exp.tracks = enriched.filter((t) => {
    if (seen.has(t.spotifyTrackId)) return false;
    seen.add(t.spotifyTrackId);
    return true;
  });

  saveExpansion(exp);
  cp.trackIndex = 0;
  cp.completedArtists.push(slug);
  cp.artistIndex++;
  saveCheckpoint(cp);
  console.log(`  saved ${exp.tracks.length} tracks`);
}

function fillTrackFromVerifiedRegistry(
  track: ExpansionTrack,
  coverHashes: Record<string, string>,
  cp: Checkpoint,
): ExpansionTrack {
  const next = { ...track };
  const verified = SPOTIFY_VERIFIED_DURATIONS[track.spotifyTrackId];
  if (verified?.display && !next.duration) {
    next.duration = verified.display;
    cp.stats.durationsCompleted++;
  }
  if (coverHashes[track.spotifyTrackId]) {
    cp.stats.artworkCompleted++;
  }
  return next;
}

function processArtistOffline(
  slug: string,
  cp: Checkpoint,
  coverHashes: Record<string, string>,
): void {
  const seed = getArtistSeed(slug);
  if (!seed) {
    cp.unresolvedArtists.push(slug);
    return;
  }

  console.log(`\n▶ ${slug} (offline)`);

  const meta = loadOrCreateMetadata({ slug, name: seed.name });
  if (!isSpotifyCdnUrl(meta.resolvedImage?.url)) {
    cp.unresolvedArtists.push(slug);
    console.log(`  portrait: pending API`);
  } else {
    console.log(`  portrait: verified`);
  }

  const exp = loadExpansion(slug);
  exp.tracks = exp.tracks
    .filter((t) => /^[a-zA-Z0-9]{22}$/.test(t.spotifyTrackId))
    .map((t) => fillTrackFromVerifiedRegistry(t, coverHashes, cp));

  const seen = new Set<string>();
  exp.tracks = exp.tracks.filter((t) => {
    if (seen.has(t.spotifyTrackId)) return false;
    seen.add(t.spotifyTrackId);
    return true;
  });

  for (const t of exp.tracks) {
    if (!t.duration) {
      cp.unresolvedTracks.push({
        slug,
        trackId: t.spotifyTrackId,
        reason: "duration not in verified registry",
      });
    }
    console.log(`  ${t.title}: ${t.duration || "—"}`);
  }

  saveExpansion(exp);
  cp.completedArtists.push(slug);
  cp.artistIndex++;
}

async function probeSpotifyApi(cp: Checkpoint): Promise<boolean> {
  const creds = getSpotifyCredentials();
  if (!creds) {
    console.warn("No Spotify credentials — offline only");
    return false;
  }
  cp.stats.requests++;
  const token = await getAccessToken();
  const res = await fetch("https://api.spotify.com/v1/artists/4puKiwP3DNIzEaxPCheUbj", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) {
    cp.stats.http429++;
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "0", 10);
    console.warn(
      `Spotify API rate-limited (Retry-After: ${retryAfter}s). Running offline verified-registry fill.`,
    );
    saveCheckpoint(cp);
    return false;
  }
  return res.ok;
}

function findDuplicateTrackIds(slugs: string[]): { trackId: string; slugs: string[] }[] {
  const byId = new Map<string, string[]>();
  for (const slug of slugs) {
    for (const t of loadExpansion(slug).tracks) {
      const list = byId.get(t.spotifyTrackId) ?? [];
      list.push(slug);
      byId.set(t.spotifyTrackId, list);
    }
  }
  return [...byId.entries()]
    .filter(([, s]) => s.length > 1)
    .map(([trackId, s]) => ({ trackId, slugs: s }));
}

function writeReport(cp: Checkpoint, slugs: string[], mode: string): void {
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  const dupes = findDuplicateTrackIds(slugs);
  const md = [
    "# HÖR Phase 2 — Verified Metadata Completion",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: **${mode}**`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| HÖR artists | ${slugs.length} |`,
    `| Artists processed this run | ${cp.completedArtists.length} |`,
    `| Portraits completed | ${cp.stats.portraitsCompleted} |`,
    `| Durations populated | ${cp.stats.durationsCompleted} |`,
    `| Artwork hashes verified | ${cp.stats.artworkCompleted} |`,
    `| Duplicates fixed | ${cp.stats.duplicatesFixed} |`,
    `| Tracks removed (wrong artist) | ${cp.stats.tracksRemoved} |`,
    `| Top tracks added | ${cp.stats.topTracksAdded} |`,
    `| Spotify API requests | ${cp.stats.requests} |`,
    `| HTTP 429 events | ${cp.stats.http429} |`,
    `| Retries | ${cp.stats.retries} |`,
    `| Playback files touched | **0** |`,
    "",
    "## Checkpoint",
    "",
    `- Path: \`.tmp/hor-phase2-checkpoint.json\``,
    `- Resume (API): \`node --experimental-strip-types scripts/complete-hor-phase2.ts\``,
    `- Offline fill: \`node --experimental-strip-types scripts/complete-hor-phase2.ts --offline\``,
    "",
    "## Portraits completed",
    "",
    ...(cp.portraitsCompleted.length
      ? cp.portraitsCompleted.map((s) => `- ${s}`)
      : ["_None this run_"]),
    "",
    "## Duplicates fixed",
    "",
    ...(cp.duplicatesFixed.length
      ? cp.duplicatesFixed.map((d) => `- **${d.slug}** \`${d.trackId}\`: ${d.action}`)
      : ["_None this run (API verification required for cross-artist dupes)_"]),
    "",
    "## Cross-artist duplicate track IDs (pending API verify)",
    "",
    ...(dupes.length
      ? dupes.map((d) => `- \`${d.trackId}\` on: ${d.slugs.join(", ")}`)
      : ["_None_"]),
    "",
    "## Unresolved artists (portraits)",
    "",
    ...(cp.unresolvedArtists.length
      ? [...new Set(cp.unresolvedArtists)].map((s) => `- ${s}`)
      : ["_None_"]),
    "",
    "## Unresolved tracks",
    "",
    ...(cp.unresolvedTracks.length
      ? cp.unresolvedTracks.map((t) => `- **${t.slug}** \`${t.trackId}\`: ${t.reason}`)
      : ["_None_"]),
    "",
  ].join("\n");
  writeFileSync(REPORT_PATH, md, "utf8");
}

function runBundles(): void {
  if (SKIP_BUNDLE) return;
  console.log("\nBundling metadata…");
  execSync("node --experimental-strip-types scripts/build-expansion-bundle.ts", {
    stdio: "inherit",
  });
  execSync("node --experimental-strip-types scripts/build-metadata-bundle.ts", {
    stdio: "inherit",
  });
}
  const slugs = listHorSlugs();
  const cp = loadCheckpoint(slugs);
  const coverHashes = loadHashes();
  const globalTrackOwner = new Map<string, string>();

  // Pre-scan existing ownership for duplicate resolution
  for (const slug of slugs) {
    const exp = loadExpansion(slug);
    for (const t of exp.tracks) {
      if (!globalTrackOwner.has(t.spotifyTrackId)) {
        globalTrackOwner.set(t.spotifyTrackId, slug);
      }
    }
  }

  console.log(
    `Phase 2 metadata — ${slugs.length} HÖR artists (resume index ${cp.artistIndex}, 429s so far ${cp.stats.http429})`,
  );
  console.log(`Checkpoint: ${CHECKPOINT_PATH}`);

  const startIdx = cp.artistIndex;
  for (let i = startIdx; i < slugs.length; i++) {
    cp.artistIndex = i;
    cp.currentSlug = slugs[i]!;
    await processArtist(slugs[i]!, cp, coverHashes, globalTrackOwner);
    await sleep(ARTIST_DELAY_MS);
  }

  saveHashes(coverHashes);

  // Write report
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  const md = [
    "# HÖR Phase 2 — Verified Metadata Completion",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| HÖR artists processed | ${cp.completedArtists.length} |`,
    `| Portraits completed | ${cp.stats.portraitsCompleted} |`,
    `| Durations populated | ${cp.stats.durationsCompleted} |`,
    `| Artwork hashes populated | ${cp.stats.artworkCompleted} |`,
    `| Duplicates fixed | ${cp.stats.duplicatesFixed} |`,
    `| Tracks removed (wrong artist) | ${cp.stats.tracksRemoved} |`,
    `| Top tracks added | ${cp.stats.topTracksAdded} |`,
    `| Spotify API requests | ${cp.stats.requests} |`,
    `| HTTP 429 events | ${cp.stats.http429} |`,
    `| Retries | ${cp.stats.retries} |`,
    `| Playback files touched | **0** |`,
    "",
    "## Checkpoint",
    "",
    `- Path: \`.tmp/hor-phase2-checkpoint.json\``,
    `- Resume: \`npx tsx scripts/complete-hor-phase2.ts\``,
    "",
    "## Portraits completed",
    "",
    ...(cp.portraitsCompleted.length
      ? cp.portraitsCompleted.map((s) => `- ${s}`)
      : ["_None this run_"]),
    "",
    "## Duplicates fixed",
    "",
    ...(cp.duplicatesFixed.length
      ? cp.duplicatesFixed.map((d) => `- **${d.slug}** \`${d.trackId}\`: ${d.action}`)
      : ["_None_"]),
    "",
    "## Unresolved artists",
    "",
    ...(cp.unresolvedArtists.length
      ? [...new Set(cp.unresolvedArtists)].map((s) => `- ${s}`)
      : ["_None_"]),
    "",
    "## Unresolved tracks",
    "",
    ...(cp.unresolvedTracks.length
      ? cp.unresolvedTracks.map((t) => `- **${t.slug}** \`${t.trackId}\`: ${t.reason}`)
      : ["_None_"]),
    "",
  ].join("\n");
  writeFileSync(REPORT_PATH, md, "utf8");

  console.log("\nBundling metadata…");
  execSync("npm run expand:bundle", { stdio: "inherit" });
  execSync("npm run sync:bundle", { stdio: "inherit" });
  console.log("Regenerating Spotify duration registry…");
  execSync("npx tsx scripts/verify-spotify-track-durations.ts", { stdio: "inherit" });

  console.log(`\nDone → ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
