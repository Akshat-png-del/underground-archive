/**
 * Full playback stability audit — every track source and YouTube set embed.
 *
 * Run:
 *   npm run audit:playback-full           # offline resolution + format checks
 *   npm run audit:playback-full -- --live # + oEmbed reachability (slow)
 *   npm run audit:playback-full -- --live --apply-blocklist
 *
 * Writes:
 *   reports/playback-stability-audit.md
 *   reports/playback-stability-audit.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { catalogTracks } from "../src/content/tracks";
import { archiveSets } from "../src/content/sets";
import { playbackItemFromTrack, playbackItemFromSet } from "../src/lib/music/playback";
import {
  analyzePlaybackItem,
  playbackSourceLabel,
  resolvePlaybackSource,
} from "../src/lib/music/playback-source";
import { extractYouTubeId, extractSpotifyEmbedUrl } from "../src/lib/music";
import {
  isValidSpotifyTrackId,
  isValidYoutubeId,
} from "../src/lib/archive/pipeline/validate";
import {
  mapWithConcurrency,
  probeSpotifyTrackId,
  probeYoutubeId,
} from "./lib/playback-url-probe";

const REPORT_MD = join(process.cwd(), "reports/playback-stability-audit.md");
const REPORT_JSON = join(process.cwd(), "reports/playback-stability-audit.json");
const BLOCKLIST_PATH = join(process.cwd(), "data/playback-blocklist.json");

const LIVE = process.argv.includes("--live");
const APPLY_BLOCKLIST = process.argv.includes("--apply-blocklist");

interface EntityRow {
  id: string;
  title: string;
  artist?: string;
  sourceKind: string;
  sourceRef: string | null;
  offlinePlayable: boolean;
  formatValid: boolean;
  issue: string | null;
  liveOk: boolean | null;
  liveReason: string | null;
}

function spotifyTrackIdFromItem(item: ReturnType<typeof playbackItemFromTrack>): string | null {
  const url = item.spotifyUrl ?? "";
  const embed = extractSpotifyEmbedUrl(url);
  const match = embed?.match(/\/track\/([a-zA-Z0-9]{22})/);
  if (match?.[1]) return match[1];
  if (item.spotifyTrackId && isValidSpotifyTrackId(item.spotifyTrackId)) return item.spotifyTrackId;
  return null;
}

function auditTrack(t: (typeof catalogTracks)[number]): EntityRow {
  const item = playbackItemFromTrack(t);
  const analysis = analyzePlaybackItem(item);
  const resolved = resolvePlaybackSource(item);
  const trackId = spotifyTrackIdFromItem(item);
  const ytId = item.youtubeId ?? extractYouTubeId(item.youtubeUrl ?? undefined) ?? null;

  let formatValid = true;
  let issue = analysis.issue;

  if (trackId && !isValidSpotifyTrackId(trackId)) {
    formatValid = false;
    issue = "Invalid Spotify track ID format";
  }
  if (ytId && !isValidYoutubeId(ytId)) {
    formatValid = false;
    issue = "Invalid YouTube ID format";
  }

  const sourceRef =
    resolved.kind === "preview"
      ? item.previewUrl ?? null
      : resolved.kind === "spotify"
        ? trackId ?? item.spotifyUrl ?? null
        : resolved.kind === "youtube"
          ? ytId
          : null;

  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    sourceKind: playbackSourceLabel(analysis.kind),
    sourceRef,
    offlinePlayable: analysis.playable && formatValid,
    formatValid,
    issue,
    liveOk: null,
    liveReason: null,
  };
}

function auditSet(s: (typeof archiveSets)[number]): EntityRow {
  const item = playbackItemFromSet(s);
  const analysis = analyzePlaybackItem(item);
  const formatValid = isValidYoutubeId(s.youtubeId);

  return {
    id: s.id,
    title: s.title,
    artist: s.artistName,
    sourceKind: playbackSourceLabel(analysis.kind),
    sourceRef: s.youtubeId,
    offlinePlayable: analysis.playable && formatValid,
    formatValid,
    issue: formatValid ? analysis.issue : "Invalid YouTube ID format",
    liveOk: null,
    liveReason: null,
  };
}

async function runLiveProbes(rows: EntityRow[]): Promise<void> {
  const probeable = rows.filter((r) => r.offlinePlayable && r.sourceRef);
  console.log(`Live probing ${probeable.length} entities…`);

  await mapWithConcurrency(probeable, 4, 200, async (row) => {
    if (row.sourceKind === "YouTube" && row.sourceRef) {
      const result = await probeYoutubeId(row.sourceRef);
      row.liveOk = result.ok;
      row.liveReason = result.reason;
      if (!result.ok) row.offlinePlayable = false;
      return;
    }
    if (row.sourceKind === "Spotify" && row.sourceRef && isValidSpotifyTrackId(row.sourceRef)) {
      const result = await probeSpotifyTrackId(row.sourceRef);
      row.liveOk = result.ok;
      row.liveReason = result.reason;
      if (!result.ok) row.offlinePlayable = false;
      return;
    }
    row.liveOk = null;
  });
}

function writeBlocklist(trackRows: EntityRow[], setRows: EntityRow[]): void {
  const youtubeIds: string[] = [];
  const spotifyTrackIds: string[] = [];

  for (const row of [...trackRows, ...setRows]) {
    if (row.liveOk === false || !row.formatValid) {
      if (row.sourceKind === "YouTube" && row.sourceRef && !row.formatValid) {
        youtubeIds.push(row.sourceRef);
      }
      if (row.sourceKind === "YouTube" && row.sourceRef && row.liveOk === false) {
        youtubeIds.push(row.sourceRef);
      }
      if (row.sourceKind === "Spotify" && row.sourceRef && row.liveOk === false) {
        if (isValidSpotifyTrackId(row.sourceRef)) spotifyTrackIds.push(row.sourceRef);
      }
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    youtubeIds: [...new Set(youtubeIds)],
    spotifyTrackIds: [...new Set(spotifyTrackIds)],
    notes:
      "IDs blocked at playback resolution. Populated by audit-playback-full --live --apply-blocklist.",
  };

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(BLOCKLIST_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote blocklist: ${BLOCKLIST_PATH}`);
}

function renderMarkdown(trackRows: EntityRow[], setRows: EntityRow[]): string {
  const workingTracks = trackRows.filter((r) => r.offlinePlayable);
  const brokenTracks = trackRows.filter((r) => !r.offlinePlayable);
  const workingSets = setRows.filter((r) => r.offlinePlayable);
  const brokenSets = setRows.filter((r) => !r.offlinePlayable);

  const liveFailed = [...trackRows, ...setRows].filter((r) => r.liveOk === false);

  const lines: string[] = [
    "# Playback Stability Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${LIVE ? "offline + live oEmbed" : "offline resolution only"}`,
    "",
    "## Summary",
    "",
    "| Category | Total | Working | Broken |",
    "|----------|------:|--------:|-------:|",
    `| Tracks | ${trackRows.length} | ${workingTracks.length} | ${brokenTracks.length} |`,
    `| Sets | ${setRows.length} | ${workingSets.length} | ${brokenSets.length} |`,
    "",
  ];

  if (LIVE) {
    lines.push(
      `| Live probe failures | ${liveFailed.length} | — | — |`,
      "",
      "Live failures are embeds that resolve offline but fail oEmbed (deleted, private, or geo-blocked).",
      "",
    );
  }

  lines.push(
    "## Working tracks",
    "",
    `${workingTracks.length} tracks have a resolvable playback source.`,
    "",
    "## Broken tracks",
    "",
    brokenTracks.length === 0
      ? "None."
      : `| ID | Title | Artist | Issue |`,
  );

  if (brokenTracks.length > 0) {
    lines.push("|----|-------|--------|-------|");
    for (const r of brokenTracks.slice(0, 80)) {
      lines.push(
        `| \`${r.id}\` | ${r.title.replace(/\|/g, "/")} | ${(r.artist ?? "—").replace(/\|/g, "/")} | ${r.issue ?? "—"} |`,
      );
    }
    if (brokenTracks.length > 80) {
      lines.push("", `*…and ${brokenTracks.length - 80} more (see JSON report).*`);
    }
  }

  lines.push("", "## Working sets", "", `${workingSets.length} sets have valid YouTube IDs.`, "");

  lines.push("## Broken sets", "");
  if (brokenSets.length === 0) {
    lines.push("None — all archive sets resolve to YouTube embeds.", "");
  } else {
    lines.push("| ID | Title | Artist | Issue |", "|----|-------|--------|-------|");
    for (const r of brokenSets) {
      lines.push(
        `| \`${r.id}\` | ${r.title.replace(/\|/g, "/")} | ${(r.artist ?? "—").replace(/\|/g, "/")} | ${r.issue ?? r.liveReason ?? "—"} |`,
      );
    }
    lines.push("");
  }

  if (LIVE && liveFailed.length > 0) {
    lines.push("## Live probe failures", "", "| ID | Kind | Source | Reason |", "|----|------|--------|--------|");
    for (const r of liveFailed.slice(0, 40)) {
      lines.push(
        `| \`${r.id}\` | ${r.sourceKind} | \`${r.sourceRef}\` | ${r.liveReason ?? "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Notes",
    "",
    "- **Broken tracks** with \"missing URL\" need Spotify/YouTube metadata in catalog expansion — not playback engine fixes.",
    "- Run `npm run audit:playback-full -- --live` before releases to catch deleted embeds.",
    "- Blocked IDs (live failures) are written to `data/playback-blocklist.json` with `--apply-blocklist`.",
    "",
  );

  return lines.join("\n");
}

async function main(): Promise<void> {
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });

  const trackRows = catalogTracks.map(auditTrack);
  const setRows = archiveSets.map(auditSet);

  if (LIVE) {
    await runLiveProbes([...trackRows, ...setRows]);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    live: LIVE,
    tracks: {
      total: trackRows.length,
      working: trackRows.filter((r) => r.offlinePlayable).length,
      broken: trackRows.filter((r) => !r.offlinePlayable).length,
      rows: trackRows,
    },
    sets: {
      total: setRows.length,
      working: setRows.filter((r) => r.offlinePlayable).length,
      broken: setRows.filter((r) => !r.offlinePlayable).length,
      rows: setRows,
    },
  };

  writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2));
  writeFileSync(REPORT_MD, renderMarkdown(trackRows, setRows));

  if (LIVE && APPLY_BLOCKLIST) {
    writeBlocklist(trackRows, setRows);
  }

  console.log(`Wrote ${REPORT_MD}`);
  console.log(`Wrote ${REPORT_JSON}`);
  console.log({
    tracks: `${payload.tracks.working}/${payload.tracks.total} working`,
    sets: `${payload.sets.working}/${payload.sets.total} working`,
    live: LIVE,
  });

  const brokenSets = setRows.filter((r) => !r.offlinePlayable);
  if (brokenSets.length > 0) {
    console.error(`FAIL: ${brokenSets.length} broken set(s) — playback gate should block release`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
