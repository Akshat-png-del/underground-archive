/**
 * Validation for the targeted new-artist ingest. Loads the fully-built catalog
 * (post authenticity + verification pipeline) and asserts integrity.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import { YOUTUBE_VERIFIED_DURATIONS, MIN_VERIFIED_SET_SECONDS } from "../src/lib/catalog/youtube-verified-durations";
import { SPOTIFY_VERIFIED_DURATIONS } from "../src/lib/catalog/spotify-verified-durations";

const result = JSON.parse(readFileSync(join(process.cwd(), ".tmp/target-artists/result.json"), "utf8")) as {
  added: { slug: string; name: string }[];
  skipped?: { slug: string; name: string }[];
  failed?: { name: string; reason: string }[];
};
const NEW_SLUGS = new Set(result.added.map((a) => a.slug));

const errors: string[] = [];
const warnings: string[] = [];
const SPOTIFY_ID_RE = /^[a-zA-Z0-9]{22}$/;
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const bySlug = new Map<string, (typeof artists)[number]>();
const seenSlug = new Set<string>();
const seenId = new Set<string>();
for (const a of artists) {
  if (seenSlug.has(a.slug)) errors.push(`DUPLICATE artist slug: ${a.slug}`);
  if (seenId.has(a.id)) errors.push(`DUPLICATE artist id: ${a.id}`);
  seenSlug.add(a.slug);
  seenId.add(a.id);
  bySlug.set(a.slug, a);
}

const spotifyIdOf = (url?: string) => url?.match(/\/track\/([a-zA-Z0-9]{22})/)?.[1];

// Global track/set uniqueness across whole catalog (by real Spotify/YouTube id).
// Report duplicates only when at least one side is a newly-ingested artist.
const trackOwner = new Map<string, string>();
const setOwner = new Map<string, string>();
for (const a of artists) {
  for (const t of a.topTracks) {
    const id = spotifyIdOf(t.spotifyUrl);
    if (!id) continue;
    const prev = trackOwner.get(id);
    if (prev && (NEW_SLUGS.has(a.slug) || NEW_SLUGS.has(prev)))
      errors.push(`DUPLICATE track ${id}: ${a.slug} & ${prev}`);
    else if (!prev) trackOwner.set(id, a.slug);
  }
  for (const s of a.essentialSets) {
    const id = s.youtubeId;
    const prev = setOwner.get(id);
    if (prev && (NEW_SLUGS.has(a.slug) || NEW_SLUGS.has(prev)))
      errors.push(`DUPLICATE set youtubeId ${id}: ${a.slug} & ${prev}`);
    else if (!prev) {
      setOwner.set(id, a.slug);
    }
    if (prev && !NEW_SLUGS.has(a.slug) && !NEW_SLUGS.has(prev))
      warnings.push(`[pre-existing] duplicate set ${id}: ${a.slug} & ${prev}`);
  }
}

// Per new-artist deep checks
let trackCount = 0;
let setCount = 0;
const setsByEvent: Record<string, number> = {};
for (const slug of NEW_SLUGS) {
  const a = bySlug.get(slug);
  if (!a) {
    errors.push(`NEW artist missing from built catalog: ${slug}`);
    continue;
  }
  if (!a.spotifyArtistId || !SPOTIFY_ID_RE.test(a.spotifyArtistId))
    errors.push(`${slug}: invalid/missing spotifyArtistId (${a.spotifyArtistId})`);
  if (!a.portrait || /placeholder|data:image\/svg/i.test(a.portrait))
    errors.push(`${slug}: missing/placeholder portrait`);
  if (!a.heroImage || /placeholder|data:image\/svg/i.test(a.heroImage))
    warnings.push(`${slug}: missing/placeholder heroImage (${a.heroImage?.slice(0, 40)})`);
  if (!a.country || a.country === "Unknown") warnings.push(`${slug}: country=${a.country}`);
  if (!a.city || a.city === "Unknown") warnings.push(`${slug}: city=${a.city}`);
  if (!a.genres.length) errors.push(`${slug}: no genres`);
  if (!a.activeSince) warnings.push(`${slug}: no activeSince`);
  if (!a.bpmRange || a.bpmRange.length !== 2) errors.push(`${slug}: bad bpmRange`);
  if (!a.moodTags.length) warnings.push(`${slug}: no moodTags`);
  if (!a.similarArtists.length) warnings.push(`${slug}: no similarArtists`);

  // similarArtists must resolve
  for (const sim of a.similarArtists) {
    if (!bySlug.has(sim)) warnings.push(`${slug}: similarArtist "${sim}" does not resolve to a catalog slug`);
  }

  const hasMedia = a.topTracks.length > 0 || a.essentialSets.length > 0;
  if (!hasMedia) errors.push(`${slug}: NO media (fails public artist gate)`);

  for (const t of a.topTracks) {
    trackCount++;
    const sid = spotifyIdOf(t.spotifyUrl);
    if (!sid || !SPOTIFY_ID_RE.test(sid))
      errors.push(`${slug}: track "${t.title}" invalid spotify id (url=${t.spotifyUrl})`);
    if (!t.coverArt) errors.push(`${slug}: track "${t.title}" missing coverArt`);
    if (!t.year) warnings.push(`${slug}: track "${t.title}" missing year`);
    const dur = sid ? SPOTIFY_VERIFIED_DURATIONS[sid] : undefined;
    if (!dur) errors.push(`${slug}: track "${t.title}" (${sid}) not in Spotify duration registry`);
    if (!t.duration) errors.push(`${slug}: track "${t.title}" has empty resolved duration`);
  }

  for (const s of a.essentialSets) {
    setCount++;
    setsByEvent[s.venue] = (setsByEvent[s.venue] ?? 0) + 1;
    if (!YT_ID_RE.test(s.youtubeId)) errors.push(`${slug}: set "${s.title}" invalid youtube id ${s.youtubeId}`);
    const vd = YOUTUBE_VERIFIED_DURATIONS[s.youtubeId];
    if (!vd) errors.push(`${slug}: set "${s.title}" (${s.youtubeId}) NOT in YouTube duration registry`);
    else if (vd.seconds < MIN_VERIFIED_SET_SECONDS)
      errors.push(`${slug}: set "${s.title}" duration ${vd.display} < 10min`);
    if (!s.year) warnings.push(`${slug}: set "${s.title}" missing year`);
    if (!s.venue) warnings.push(`${slug}: set "${s.title}" missing venue`);
  }
}

console.log(`\n=== TARGET INGEST VALIDATION ===`);
console.log(`Built catalog artists: ${artists.length}`);
console.log(`New artists validated: ${NEW_SLUGS.size}`);
console.log(`New tracks: ${trackCount} · New sets: ${setCount}`);
console.log(`Sets by event:`, setsByEvent);
console.log(`\nERRORS: ${errors.length}`);
errors.forEach((e) => console.log(`  ✗ ${e}`));
console.log(`\nWARNINGS: ${warnings.length}`);
warnings.forEach((w) => console.log(`  ⚠ ${w}`));

if (errors.length) process.exit(1);
console.log(`\n✓ VALIDATION PASSED`);
