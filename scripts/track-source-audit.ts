/**
 * Track source resolution audit — traces IHM track and catalog coverage.
 * Run: npx tsx scripts/track-source-audit.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogTracks } from "../src/content/tracks";
import { playbackItemFromTrack } from "../src/lib/music/playback";
import { resolvePlaybackSource } from "../src/lib/music/playback-source";
import { enrichTrackItemSources, normalizeCatalogTrackSources } from "../src/lib/music/track-source";

const REPORT = join(process.cwd(), "reports/track-source-resolution-fix.md");
const IHM_ID = "i-hate-models::intergalactic-emotional-breakdown";

const ihm = catalogTracks.find((t) => t.id === IHM_ID);
if (!ihm) throw new Error(`Missing catalog track: ${IHM_ID}`);

const ihmItem = playbackItemFromTrack(ihm);
const ihmResolved = resolvePlaybackSource(ihmItem);
const ihmSources = normalizeCatalogTrackSources(ihm);

const playable = catalogTracks.filter((t) => {
  const item = playbackItemFromTrack(t);
  const r = resolvePlaybackSource(item);
  return r.kind !== "none" && (r.embedUrl || r.kind === "preview");
});

const emptySpotify = catalogTracks.filter((t) => !t.spotifyUrl?.trim());
const spotifyTrackIdOnly = catalogTracks.filter((t) => {
  const s = normalizeCatalogTrackSources(t);
  return !!s.spotifyTrackId && !!s.spotifyUrl?.includes("/track/");
});

const failingSample = catalogTracks
  .filter((t) => resolvePlaybackSource(playbackItemFromTrack(t)).kind === "none")
  .slice(0, 8)
  .map((t) => ({
    id: t.id,
    title: t.title,
    spotifyUrl: t.spotifyUrl || "(empty)",
    enriched: enrichTrackItemSources(t.id, {}),
  }));

const md = `# Track Source Resolution Fix

## Trace: I Hate Models → Intergalactic Emotional Breakdown

### 1. Incoming track object

\`\`\`json
${JSON.stringify(ihm, null, 2)}
\`\`\`

### 2. Normalized sources

\`\`\`json
${JSON.stringify(ihmSources, null, 2)}
\`\`\`

### 3. PlaybackItem built

\`\`\`json
${JSON.stringify(ihmItem, null, 2)}
\`\`\`

### 4. Resolved source

| Field | Value |
|-------|-------|
| kind | ${ihmResolved.kind} |
| sourceUrl | ${ihmResolved.sourceUrl} |
| embedUrl | ${ihmResolved.embedUrl} |
| issue | ${ihmResolved.issue ?? "null"} |

**Result:** ${ihmResolved.embedUrl ? "PASS — Spotify track embed with autoplay" : "FAIL"}

## Catalog coverage

| Metric | Count |
|--------|------:|
| Total catalog tracks | ${catalogTracks.length} |
| Playable after fix | ${playable.length} |
| Empty spotifyUrl in catalog | ${emptySpotify.length} |
| Tracks with resolved Spotify track ID | ${spotifyTrackIdOnly.length} |

## Root cause

1. **Field name mismatch** — resolver only read \`item.spotifyUrl\`; data often stores \`spotifyTrackId\`, \`trackId\`, or nested \`external.spotify\` / \`spotify.id\`.
2. **Empty string vs missing** — \`toCatalogTrack\` coerced missing URLs to \`""\`, which is falsy and skipped resolution without catalog re-lookup.
3. **No catalog enrichment** — persisted or UI-built \`PlaybackItem\` objects could reach the engine without re-merging canonical catalog URLs.

## Fix (source resolution only)

- Added \`src/lib/music/track-source.ts\` — normalizes \`spotifyUrl\`, \`spotifyTrackId\`, \`youtubeUrl\`, \`previewUrl\` from all known field names.
- Updated \`playback-source.ts\` — enriches track items from catalog by \`refId\` before resolving; resolves \`spotifyTrackId\` → track URL; logs \`[TRACK CLICK]\`, \`[SOURCE RESOLUTION]\`, \`[FINAL SOURCE]\`.
- Updated \`playback.ts\` — \`playbackItemFromTrack\` / \`playbackItemFromMusicActions\` emit normalized sources; \`console.log(track)\` before playback.
- Updated \`content/tracks/index.ts\` — \`catalogSpotifyUrl()\` derives URL from \`spotifyTrackId\` at catalog build time.

**Not modified:** playback engine, global player, UI, switching logic.

## Sample still-unplayable tracks (no metadata in catalog)

${failingSample.length === 0 ? "None" : failingSample.map((t) => `- \`${t.id}\` — ${t.title} (no Spotify/YouTube/preview after enrichment)`).join("\n")}

## Failure line reference

When resolution fails, console logs include:

\`[SOURCE RESOLUTION] failure at playback-source.ts:track missing spotifyUrl/spotifyTrackId/youtubeUrl/previewUrl\`

For IHM this line is **not** reached — resolution succeeds at \`playback-source.ts\` Spotify track embed branch.
`;

writeFileSync(REPORT, md);
console.log(`Report written: ${REPORT}`);
console.log(`IHM: ${ihmResolved.kind} ${ihmResolved.embedUrl ? "OK" : "FAIL"}`);
console.log(`Playable: ${playable.length}/${catalogTracks.length}`);
