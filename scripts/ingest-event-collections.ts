#!/usr/bin/env npx tsx
/**
 * Verified official event-collection ingest.
 *
 * Walks OFFICIAL YouTube channels for six event collections and attaches only
 * verified long-form performances (public, ≥10 min, correct channel, real artist
 * attribution) to existing catalog artists. Unverifiable / unknown-artist uploads
 * are queued — never fabricated.
 *
 * Collections (routed automatically via set venue → inferSetCollection):
 *   Verknipt · Teletech · Intercell · Stone Techno · Festival Sets · Warehouse Sessions
 *
 * Catalog / content only — never touches playback.
 *
 * Usage:
 *   npx tsx scripts/ingest-event-collections.ts            # all channels, existing-artist attach
 *   EVENT_ONLY=verknipt npx tsx scripts/ingest-event-collections.ts
 *   EVENT_REFRESH=1 ...                                     # ignore per-channel upload cache
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
import type { CatalogExpansion, ExpansionSet } from "../src/lib/catalog/types";
import { getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson, sleep } from "../src/lib/ingestion/http";

const MIN_SECONDS = 10 * 60;
const MAX_PAGES = 60; // up to 3000 uploads per channel
const OUT_DIR = join(process.cwd(), "data/catalog-expansion");
const CACHE_DIR = join(process.cwd(), ".tmp/event-collections");
const REPORT_PATH = join(process.cwd(), "reports/event-collections-ingestion.md");
const QUEUE_PATH = join(CACHE_DIR, "unmatched-queue.json");
const RESULT_PATH = join(CACHE_DIR, "result.json");

const SKIP_TITLE =
  /\b(trailer|teaser|clip|shorts?|aftermovie|recap|announcement|promo|preview|snippet|highlights?|countdown|interview|podcast|talk|documentary|q\s*&\s*a|reel|edit|visualizer|lyric)\b|#shorts?/i;

interface ChannelConfig {
  key: string;
  /** Live search query used to resolve the official channel. */
  query: string;
  /** Channel title must contain one of these (normalized) to be accepted. */
  titleMatch: string[];
  /** Canonical venue written onto every set (drives collection routing). */
  venue: string;
  /** Human collection label for reporting. */
  collection: string;
}

const CHANNELS: ChannelConfig[] = [
  { key: "verknipt", query: "Verknipt", titleMatch: ["verknipt"], venue: "Verknipt", collection: "Verknipt" },
  { key: "teletech", query: "Teletech Music", titleMatch: ["teletech"], venue: "Teletech", collection: "Teletech" },
  { key: "intercell", query: "Intercell", titleMatch: ["intercell"], venue: "Intercell", collection: "Intercell" },
  { key: "stone-techno", query: "Stone Techno Festival", titleMatch: ["stone techno"], venue: "Stone Techno", collection: "Stone Techno" },
  { key: "time-warp", query: "Time Warp", titleMatch: ["time warp", "time-warp"], venue: "Time Warp", collection: "Festival Sets" },
  { key: "dekmantel", query: "Dekmantel", titleMatch: ["dekmantel"], venue: "Dekmantel", collection: "Festival Sets" },
  { key: "gotec", query: "Gotec Club Karlsruhe", titleMatch: ["gotec"], venue: "Gotec", collection: "Warehouse Sessions" },
  { key: "terminal-v", query: "Terminal V", titleMatch: ["terminal v"], venue: "Terminal V", collection: "Warehouse Sessions" },
];

interface CatalogArtist {
  slug: string;
  name: string;
  nameFold: string;
  spotifyArtistId?: string;
}

interface Report {
  channelsResolved: { key: string; title: string; channelId: string; venue: string; collection: string }[];
  channelsFailed: { key: string; reason: string }[];
  uploadsListed: number;
  eligible: number;
  setsAdded: { slug: string; youtubeId: string; venue: string; title: string }[];
  artistsEnriched: Set<string>;
  duplicatesRemoved: { youtubeId: string; removedFrom: string; keptWith: string }[];
  misattributedRemoved: { slug: string; youtubeId: string; title: string }[];
  duplicatesAvoided: number;
  rejectedUploads: { youtubeId: string; reason: string }[];
  invalidSkipped: { youtubeId: string; title: string; reason: string }[];
  queuedUnmatched: { youtubeId: string; title: string; venue: string }[];
  collectionCounts: Record<string, number>;
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

function allCatalogArtists(): CatalogArtist[] {
  const raw = [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists];
  const bySlug = new Map<string, CatalogArtist>();
  for (const a of raw) {
    if (bySlug.has(a.slug)) continue;
    bySlug.set(a.slug, {
      slug: a.slug,
      name: a.name,
      nameFold: fold(a.name).replace(/[^a-z0-9]+/g, " ").trim(),
      spotifyArtistId: a.spotifyArtistId,
    });
  }
  return [...bySlug.values()];
}

/**
 * The performer billing is the leading segment before any host / venue / event
 * marker. This prevents attributing a set to an artist who only appears as the
 * event host (e.g. "Cynthia Spiering at Intercell x 999999999 Invites").
 */
function performerSegment(title: string): string {
  const lower = fold(title);
  const markers = [" @ ", " at ", " | ", " live at ", " invites", " presents", " present ", " pres. ", " pres "];
  let cut = title.length;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx >= 0 && idx < cut) cut = idx;
  }
  return title.slice(0, cut);
}

/**
 * Find the catalog artist billed as the performer in the official title,
 * preferring the earliest-appearing (primary billing) then longest name.
 * Matches only within the performer segment — real word-boundary matches, never fuzzy.
 */
function matchCatalogInTitle(title: string, catalog: CatalogArtist[]): CatalogArtist | null {
  const segFold = fold(performerSegment(title));
  let best: CatalogArtist | null = null;
  let bestPos = Number.MAX_SAFE_INTEGER;
  let bestLen = 0;
  for (const a of catalog) {
    const nf = a.nameFold;
    if (nf.replace(/[^a-z0-9]/g, "").length < 4) continue; // skip very short names (false positives)
    const escaped = nf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    const m = re.exec(segFold);
    if (!m) continue;
    const pos = m.index;
    const len = nf.replace(/[^a-z0-9]/g, "").length;
    if (pos < bestPos || (pos === bestPos && len > bestLen)) {
      best = a;
      bestPos = pos;
      bestLen = len;
    }
  }
  return best;
}

async function resolveChannel(cfg: ChannelConfig, key: string): Promise<{ channelId: string; title: string; uploads: string } | null> {
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5` +
    `&q=${encodeURIComponent(cfg.query)}&key=${key}`;
  const search = await fetchJson<{
    items?: { snippet?: { channelId?: string; channelTitle?: string; title?: string } }[];
    error?: { message?: string };
  }>(searchUrl, { provider: "youtube" });
  if (search.error?.message) throw new Error(search.error.message);

  let channelId: string | null = null;
  let title = "";
  for (const item of search.items ?? []) {
    const t = fold(item.snippet?.title ?? item.snippet?.channelTitle ?? "");
    if (cfg.titleMatch.some((tm) => t.includes(fold(tm)))) {
      channelId = item.snippet?.channelId ?? null;
      title = item.snippet?.title ?? item.snippet?.channelTitle ?? "";
      break;
    }
  }
  if (!channelId) return null;

  const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${key}`;
  const ch = await fetchJson<{
    items?: {
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  }>(chUrl, { provider: "youtube" });
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return null;
  return { channelId, title: ch.items?.[0]?.snippet?.title ?? title, uploads };
}

async function listUploads(uploads: string, key: string): Promise<{ id: string; title: string; publishedAt?: string }[]> {
  const out: { id: string; title: string; publishedAt?: string }[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails` +
      `&playlistId=${uploads}&maxResults=50&key=${key}` +
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
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) out.push({ id, title, publishedAt: item.snippet?.publishedAt });
    }
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
    await sleep(80);
  }
  return out;
}

async function fetchVideoDetails(ids: string[], key: string) {
  const out: { id: string; title: string; channelId: string; seconds: number; public: boolean; publishedAt?: string }[] = [];
  for (let i = 0; i < ids.length; i += 45) {
    const chunk = ids.slice(i, i + 45);
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
    await sleep(60);
  }
  return out;
}

type EligibleSet = { id: string; title: string; seconds: number; publishedAt?: string; venue: string; collection: string };

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

async function collectEligible(cfg: ChannelConfig, key: string, report: Report): Promise<EligibleSet[]> {
  const refresh = process.env.EVENT_REFRESH === "1";
  const cache = cachePath(cfg.key);
  if (!refresh && existsSync(cache)) {
    const rows = JSON.parse(readFileSync(cache, "utf8")) as EligibleSet[];
    console.log(`  [${cfg.key}] cache: ${rows.length} eligible sets`);
    report.uploadsListed += rows.length;
    report.eligible += rows.length;
    return rows;
  }

  const resolved = await resolveChannel(cfg, key);
  if (!resolved) {
    report.channelsFailed.push({ key: cfg.key, reason: "official channel not resolved/verified" });
    console.log(`  [${cfg.key}] channel not resolved — skipped`);
    return [];
  }
  report.channelsResolved.push({
    key: cfg.key,
    title: resolved.title,
    channelId: resolved.channelId,
    venue: cfg.venue,
    collection: cfg.collection,
  });
  console.log(`  [${cfg.key}] resolved "${resolved.title}" (${resolved.channelId})`);

  const uploads = await listUploads(resolved.uploads, key);
  report.uploadsListed += uploads.length;
  console.log(`  [${cfg.key}] uploads: ${uploads.length}`);

  const candidates = uploads.filter((u) => !SKIP_TITLE.test(u.title));
  const details = await fetchVideoDetails(candidates.map((c) => c.id), key);
  const titleById = new Map(candidates.map((c) => [c.id, c.title]));

  const eligible: EligibleSet[] = [];
  for (const d of details) {
    const title = d.title || titleById.get(d.id) || "";
    if (d.channelId !== resolved.channelId) {
      report.rejectedUploads.push({ youtubeId: d.id, reason: "wrong channel" });
      continue;
    }
    if (!d.public) {
      report.rejectedUploads.push({ youtubeId: d.id, reason: "not public" });
      continue;
    }
    if (SKIP_TITLE.test(title)) {
      report.invalidSkipped.push({ youtubeId: d.id, title, reason: "clip/teaser title" });
      continue;
    }
    if (d.seconds < MIN_SECONDS) {
      report.rejectedUploads.push({ youtubeId: d.id, reason: `duration ${d.seconds}s < 10m` });
      continue;
    }
    eligible.push({ id: d.id, title, seconds: d.seconds, publishedAt: d.publishedAt, venue: cfg.venue, collection: cfg.collection });
  }
  report.eligible += eligible.length;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cache, `${JSON.stringify(eligible, null, 2)}\n`, "utf8");
  console.log(`  [${cfg.key}] eligible long-form official sets: ${eligible.length}`);
  return eligible;
}

/**
 * Remove any set youtubeId that exists in more than one expansion file.
 * Keeper = the artist billed earliest in the set title (matches the display-layer
 * dedupe in content/sets); falls back to the current owner. Never fabricates.
 */
function removeDuplicateSetsAcrossExpansions(report: Report, catalog: CatalogArtist[]): void {
  if (!existsSync(OUT_DIR)) return;
  const nameBySlug = new Map(catalog.map((a) => [a.slug, a.nameFold]));
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".json")).sort();

  // Pass 1: gather every (slug, title) occurrence per youtubeId.
  const occ = new Map<string, { slug: string; title: string }[]>();
  const expBySlug = new Map<string, CatalogExpansion>();
  for (const file of files) {
    const exp = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    expBySlug.set(exp.slug, exp);
    for (const s of exp.sets ?? []) {
      const list = occ.get(s.youtubeId) ?? [];
      list.push({ slug: exp.slug, title: s.title });
      occ.set(s.youtubeId, list);
    }
  }

  // Pass 2: choose keeper per duplicated youtubeId.
  const keeper = new Map<string, string>();
  for (const [ytId, list] of occ) {
    const distinctSlugs = new Set(list.map((l) => l.slug));
    if (list.length === 1) continue;
    if (distinctSlugs.size === 1) {
      keeper.set(ytId, list[0].slug); // in-file duplicate only
      continue;
    }
    let bestSlug = list[0].slug;
    let bestPos = Number.MAX_SAFE_INTEGER;
    for (const { slug, title } of list) {
      const nf = nameBySlug.get(slug);
      const pos = nf ? fold(title).indexOf(nf) : -1;
      const rank = pos === -1 ? Number.MAX_SAFE_INTEGER - 1 : pos;
      if (rank < bestPos) {
        bestPos = rank;
        bestSlug = slug;
      }
    }
    keeper.set(ytId, bestSlug);
  }

  // Pass 3: rewrite files, removing non-keeper copies + in-file dups.
  for (const [slug, exp] of expBySlug) {
    let changed = false;
    const kept: ExpansionSet[] = [];
    const seenLocal = new Set<string>();
    for (const s of exp.sets ?? []) {
      const k = keeper.get(s.youtubeId);
      if (seenLocal.has(s.youtubeId)) {
        report.duplicatesRemoved.push({ youtubeId: s.youtubeId, removedFrom: slug, keptWith: slug });
        changed = true;
        continue;
      }
      if (k && k !== slug) {
        report.duplicatesRemoved.push({ youtubeId: s.youtubeId, removedFrom: slug, keptWith: k });
        changed = true;
        continue;
      }
      seenLocal.add(s.youtubeId);
      kept.push(s);
    }
    if (changed) {
      exp.sets = kept;
      saveExpansion(exp);
    }
  }
}

/** Venues this ingester manages — only these are eligible for misattribution pruning. */
const MANAGED_VENUES = new Set(CHANNELS.map((c) => fold(c.venue)));

/**
 * Remove managed-venue sets whose owning artist is NOT the performer billed in the
 * title (e.g. attached because the artist appears only as the event host). Corrects
 * prior misattributions. Never fabricates — only removes.
 */
function pruneMisattributedEventSets(catalog: CatalogArtist[], report: Report): void {
  if (!existsSync(OUT_DIR)) return;
  const nameBySlug = new Map(catalog.map((a) => [a.slug, a.nameFold]));
  for (const file of readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"))) {
    const exp = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8")) as CatalogExpansion;
    const ownerNameFold = nameBySlug.get(exp.slug);
    if (!ownerNameFold) continue;
    const escaped = ownerNameFold.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    let changed = false;
    const kept: ExpansionSet[] = [];
    for (const s of exp.sets ?? []) {
      if (!MANAGED_VENUES.has(fold(s.venue))) {
        kept.push(s);
        continue;
      }
      const titleFold = fold(s.title);
      const segFold = fold(performerSegment(s.title));
      const ownerIsPerformer = re.test(segFold);
      const ownerInTitle = re.test(titleFold);
      // Remove ONLY when the owner is named in the title but NOT as the performer
      // (i.e. appears solely as the event host). Generic titles that don't name the
      // owner at all are left untouched — they are pre-existing editorial attributions.
      if (!ownerIsPerformer && ownerInTitle) {
        changed = true;
        report.misattributedRemoved.push({ slug: exp.slug, youtubeId: s.youtubeId, title: s.title });
        report.queuedUnmatched.push({ youtubeId: s.youtubeId, title: s.title, venue: s.venue });
      } else {
        kept.push(s);
      }
    }
    if (changed) {
      exp.sets = kept;
      saveExpansion(exp);
    }
  }
}

async function main() {
  const key = getYoutubeApiKey();
  if (!key) {
    console.error("YOUTUBE_API_KEY required in .env.local");
    process.exit(1);
  }
  mkdirSync(CACHE_DIR, { recursive: true });

  const report: Report = {
    channelsResolved: [],
    channelsFailed: [],
    uploadsListed: 0,
    eligible: 0,
    setsAdded: [],
    artistsEnriched: new Set<string>(),
    duplicatesRemoved: [],
    misattributedRemoved: [],
    duplicatesAvoided: 0,
    rejectedUploads: [],
    invalidSkipped: [],
    queuedUnmatched: [],
    collectionCounts: {},
  };

  const only = process.env.EVENT_ONLY?.trim();
  const channels = only ? CHANNELS.filter((c) => c.key === only) : CHANNELS;

  const catalog = allCatalogArtists();
  console.log(`Catalog artists available for attribution: ${catalog.length}\n`);

  console.log("Pruning misattributed event sets (performer ≠ owner)…");
  pruneMisattributedEventSets(catalog, report);
  if (report.misattributedRemoved.length) {
    console.log(`  removed ${report.misattributedRemoved.length} misattributed sets`);
  }

  // Global youtubeId → owner map (existing sets) to prevent duplicates.
  const youtubeOwners = new Map<string, string>();
  for (const a of catalog) {
    for (const s of loadExpansion(a.slug).sets) {
      if (!youtubeOwners.has(s.youtubeId)) youtubeOwners.set(s.youtubeId, a.slug);
    }
  }

  console.log("Resolving official channels + collecting eligible sets…");
  const allEligible: EligibleSet[] = [];
  for (const cfg of channels) {
    const rows = await collectEligible(cfg, key, report);
    allEligible.push(...rows);
    await sleep(120);
  }
  console.log(`\nTotal eligible official sets: ${allEligible.length}`);

  console.log("Attaching to existing catalog artists…");
  for (const d of allEligible) {
    const artist = matchCatalogInTitle(d.title, catalog);
    if (!artist) {
      report.queuedUnmatched.push({ youtubeId: d.id, title: d.title, venue: d.venue });
      continue;
    }
    if (!artist.spotifyArtistId) {
      report.queuedUnmatched.push({ youtubeId: d.id, title: d.title, venue: d.venue });
      continue;
    }
    const owner = youtubeOwners.get(d.id);
    if (owner && owner !== artist.slug) {
      report.duplicatesAvoided++;
      continue;
    }
    const exp = loadExpansion(artist.slug);
    if (exp.sets.some((s) => s.youtubeId === d.id)) {
      report.duplicatesAvoided++;
      continue;
    }
    const set: ExpansionSet = {
      title: d.title,
      venue: d.venue,
      year: extractYear(d.title, d.publishedAt),
      youtubeId: d.id,
    };
    exp.sets.push(set);
    saveExpansion(exp);
    youtubeOwners.set(d.id, artist.slug);
    report.setsAdded.push({ slug: artist.slug, youtubeId: d.id, venue: d.venue, title: d.title });
    report.artistsEnriched.add(artist.slug);
    report.collectionCounts[d.collection] = (report.collectionCounts[d.collection] ?? 0) + 1;
  }

  console.log("Removing pre-existing duplicate sets across expansions…");
  removeDuplicateSetsAcrossExpansions(report, catalog);

  // Persist queue for later verified new-artist resolution (never auto-create incomplete artists).
  writeFileSync(
    QUEUE_PATH,
    `${JSON.stringify(
      { generatedAt: new Date().toISOString(), count: report.queuedUnmatched.length, items: report.queuedUnmatched.slice(0, 2000) },
      null,
      2,
    )}\n`,
  );

  const enriched = [...report.artistsEnriched].sort();
  const md = [
    "# Event Collections Ingestion",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Official channels used | ${report.channelsResolved.length} |`,
    `| Channels failed to resolve | ${report.channelsFailed.length} |`,
    `| Uploads listed | ${report.uploadsListed} |`,
    `| Eligible long-form official sets | ${report.eligible} |`,
    `| New artists added | 0 |`,
    `| Existing artists enriched | ${enriched.length} |`,
    `| Sets added | ${report.setsAdded.length} |`,
    `| Tracks added | 0 |`,
    `| Misattributed sets removed | ${report.misattributedRemoved.length} |`,
    `| Duplicate sets removed | ${report.duplicatesRemoved.length} |`,
    `| Duplicates avoided (attach) | ${report.duplicatesAvoided} |`,
    `| Rejected uploads | ${report.rejectedUploads.length} |`,
    `| Invalid uploads skipped | ${report.invalidSkipped.length} |`,
    `| Unmatched queued | ${report.queuedUnmatched.length} |`,
    `| Playback files touched | **0** |`,
    "",
    "## Official channels used",
    "",
    ...(report.channelsResolved.length
      ? report.channelsResolved.map((c) => `- **${c.collection}** — ${c.title} \`${c.channelId}\` (venue: ${c.venue})`)
      : ["_None resolved_"]),
    "",
    "## Sets added per collection",
    "",
    ...(Object.keys(report.collectionCounts).length
      ? Object.entries(report.collectionCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([c, n]) => `- **${c}**: ${n}`)
      : ["_None_"]),
    "",
    "## Existing artists enriched",
    "",
    ...(enriched.length ? enriched.map((s) => `- ${s}`) : ["_None_"]),
    "",
    "## Sets added (sample)",
    "",
    ...report.setsAdded.slice(0, 150).map((s) => `- **${s.slug}** \`${s.youtubeId}\` [${s.venue}] — ${s.title}`),
    report.setsAdded.length > 150 ? `\n_…and ${report.setsAdded.length - 150} more_` : "",
    "",
    "## Duplicate sets removed",
    "",
    ...(report.duplicatesRemoved.length
      ? report.duplicatesRemoved.slice(0, 100).map((d) => `- \`${d.youtubeId}\` removed from ${d.removedFrom} (kept with ${d.keptWith})`)
      : ["_None_"]),
    "",
    "## Misattributed sets removed (performer ≠ owner)",
    "",
    ...(report.misattributedRemoved.length
      ? report.misattributedRemoved.slice(0, 100).map((d) => `- \`${d.youtubeId}\` from ${d.slug} — ${d.title}`)
      : ["_None_"]),
    "",
    "## Channels that failed to resolve",
    "",
    ...(report.channelsFailed.length ? report.channelsFailed.map((c) => `- ${c.key}: ${c.reason}`) : ["_None_"]),
    "",
    `_Unmatched uploads queued for verified new-artist resolution: ${report.queuedUnmatched.length} → ${QUEUE_PATH}_`,
    "",
  ].join("\n");

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(REPORT_PATH, md, "utf8");
  writeFileSync(
    RESULT_PATH,
    `${JSON.stringify({ ...report, artistsEnriched: enriched }, null, 2)}\n`,
  );

  console.log(`\nDone. Sets added: ${report.setsAdded.length} · artists enriched: ${enriched.length} · queued: ${report.queuedUnmatched.length}`);
  console.log(`Report → ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
