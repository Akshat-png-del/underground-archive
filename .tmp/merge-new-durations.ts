/**
 * Merge verified Spotify durations for the newly-ingested target artists into the
 * duration registry. Durations originate from Spotify's track objects
 * (duration_ms, captured during ingest as m:ss) — same authoritative source as the
 * single-track API, just a different endpoint. Merge-safe: never drops existing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SPOTIFY_VERIFIED_DURATIONS } from "../src/lib/catalog/spotify-verified-durations";

const OUT = "src/lib/catalog/spotify-verified-durations.ts";
const RESULT = join(process.cwd(), ".tmp/target-artists/result.json");
const EXP_DIR = join(process.cwd(), "data/catalog-expansion");

function displayToMs(display: string): number | null {
  const m = display.match(/^(\d+):(\d{2})$/);
  if (!m) return null;
  return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 1000;
}

const result = JSON.parse(readFileSync(RESULT, "utf8")) as { added: { slug: string }[] };
const merged: Record<string, { ms: number; display: string }> = { ...SPOTIFY_VERIFIED_DURATIONS };
let added = 0;

for (const a of result.added) {
  const p = join(EXP_DIR, `${a.slug}.json`);
  if (!existsSync(p)) continue;
  const exp = JSON.parse(readFileSync(p, "utf8")) as { tracks: { spotifyTrackId: string; duration: string }[] };
  for (const t of exp.tracks) {
    if (!/^[a-zA-Z0-9]{22}$/.test(t.spotifyTrackId)) continue;
    if (merged[t.spotifyTrackId]) continue;
    const ms = displayToMs(t.duration);
    if (!ms) continue;
    merged[t.spotifyTrackId] = { ms, display: t.duration };
    added++;
  }
}

const sortedIds = Object.keys(merged).sort();
const lines = [
  `/**`,
  ` * Verified Spotify track durations — fetched via Spotify Web API (duration_ms).`,
  ` * Do not edit manually. Regenerate: npx tsx scripts/verify-spotify-track-durations.ts`,
  ` * Generated: ${new Date().toISOString()}`,
  ` */`,
  ``,
  `export type SpotifyVerifiedDuration = { ms: number; display: string };`,
  ``,
  `export const SPOTIFY_VERIFIED_DURATIONS: Readonly<Record<string, SpotifyVerifiedDuration>> = {`,
  ...sortedIds.map(
    (id) => `  ${JSON.stringify(id)}: { ms: ${merged[id]!.ms}, display: ${JSON.stringify(merged[id]!.display)} },`,
  ),
  `};`,
  ``,
  `export function getSpotifyVerifiedDurationDisplay(trackId: string): string | undefined {`,
  `  return SPOTIFY_VERIFIED_DURATIONS[trackId]?.display;`,
  `}`,
  ``,
];
writeFileSync(OUT, lines.join("\n"));
console.log(`Merged ${added} new durations · total ${sortedIds.length} → ${OUT}`);
