/**
 * Playback coverage audit — validates every catalog entity has a resolvable source
 * and scans UI components for inline audio/embed bypasses.
 *
 * Run: npm run audit:playback
 */
import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists";
import { catalogTracks, catalogReleases } from "../src/content/tracks";
import { archiveSets } from "../src/content/sets";
import { getWeeklyDiscoveriesEditorial } from "../src/content/home/feed";
import { getRecommendedTracks } from "../src/content/tracks";
import { resolveListeningPathPlaybackItem } from "../src/lib/artists/listening-path";
import {
  playbackItemFromTrack,
  playbackItemFromSet,
  playbackItemFromRelease,
} from "../src/lib/music/playback";
import {
  analyzePlaybackItem,
  playbackSourceLabel,
} from "../src/lib/music/playback-source";

const REPORT_PATH = join(process.cwd(), "reports/playback-coverage-audit.md");

interface AuditEntry {
  surface: string;
  id: string;
  title: string;
  type: string;
  playable: boolean;
  sourceKind: string;
  issue: string | null;
}

function pushEntries(
  entries: AuditEntry[],
  surface: string,
  items: { id: string; title: string; type: string; item: ReturnType<typeof playbackItemFromTrack> }[],
) {
  for (const { id, title, type, item } of items) {
    const analysis = analyzePlaybackItem(item);
    entries.push({
      surface,
      id,
      title,
      type,
      playable: analysis.playable,
      sourceKind: playbackSourceLabel(analysis.kind),
      issue: analysis.issue,
    });
  }
}

function scanComponentBypasses(): string[] {
  const srcRoot = join(process.cwd(), "src/components");
  const bypasses: string[] = [];
  const allowedIframeFiles: string[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.name.endsWith(".tsx")) continue;
      const rel = full.replace(process.cwd() + "/", "");
      if (allowedIframeFiles.includes(rel)) continue;
      const content = readFileSync(full, "utf8");
      if (/<iframe\b/.test(content)) {
        bypasses.push(rel);
      }
    }
  }

  walk(srcRoot);
  return bypasses.sort();
}

function main() {
  const entries: AuditEntry[] = [];

  pushEntries(
    entries,
    "catalog-tracks",
    catalogTracks.map((t) => ({
      id: t.id,
      title: t.title,
      type: "track",
      item: playbackItemFromTrack(t),
    })),
  );

  pushEntries(
    entries,
    "archive-sets",
    archiveSets.map((s) => ({
      id: s.id,
      title: s.title,
      type: "set",
      item: playbackItemFromSet(s),
    })),
  );

  pushEntries(
    entries,
    "catalog-releases",
    catalogReleases.map((r) => ({
      id: r.id,
      title: r.title,
      type: "release",
      item: playbackItemFromRelease(r),
    })),
  );

  const editorial = getWeeklyDiscoveriesEditorial();
  pushEntries(
    entries,
    "homepage-featured-tracks",
    editorial.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      type: "track",
      item: playbackItemFromTrack(t),
    })),
  );
  pushEntries(
    entries,
    "homepage-featured-sets",
    editorial.sets.map((s) => ({
      id: s.id,
      title: s.title,
      type: "set",
      item: playbackItemFromSet(s),
    })),
  );

  const recommendedSample = artists.slice(0, 20).flatMap((a) =>
    getRecommendedTracks(a.slug, 3).map((t) => ({
      id: t.id,
      title: t.title,
      type: "track" as const,
      item: playbackItemFromTrack(t),
    })),
  );
  pushEntries(entries, "recommended-tracks-sample", recommendedSample);

  const listeningPathItems = artists.flatMap((artist) =>
    artist.listeningPath.map((step, i) => {
      const item = resolveListeningPathPlaybackItem(artist, step);
      const analysis = item ? analyzePlaybackItem(item) : null;
      return {
        id: `${artist.slug}:${step.type}:${i}`,
        title: `${artist.name} — ${step.title}`,
        type: step.type,
        item,
        analysis,
      };
    }),
  );

  for (const row of listeningPathItems) {
    entries.push({
      surface: "listening-path",
      id: row.id,
      title: row.title,
      type: row.type,
      playable: row.analysis?.playable ?? false,
      sourceKind: row.analysis ? playbackSourceLabel(row.analysis.kind) : "none",
      issue: row.item ? row.analysis?.issue ?? null : "Could not resolve catalog item",
    });
  }

  const total = entries.length;
  const working = entries.filter((e) => e.playable).length;
  const failed = entries.filter((e) => !e.playable);
  const missingUrls = failed.filter((e) => e.issue?.includes("missing") || e.issue?.includes("Missing"));
  const invalidUrls = failed.filter((e) => e.issue?.includes("Unsupported") || e.issue?.includes("format"));
  const unsupported = failed.filter(
    (e) => !missingUrls.includes(e) && !invalidUrls.includes(e) && e.issue,
  );

  const bypasses = scanComponentBypasses();

  const bySurface = new Map<string, { total: number; working: number }>();
  for (const e of entries) {
    const row = bySurface.get(e.surface) ?? { total: 0, working: 0 };
    row.total += 1;
    if (e.playable) row.working += 1;
    bySurface.set(e.surface, row);
  }

  const failedSample = failed.slice(0, 40);
  const lines: string[] = [
    "# Playback Coverage Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total playable entities audited | ${total} |`,
    `| Working (resolvable source) | ${working} |`,
    `| Failed / no source | ${failed.length} |`,
    `| Missing URLs | ${missingUrls.length} |`,
    `| Invalid URLs | ${invalidUrls.length} |`,
    `| Unsupported / unresolved | ${unsupported.length} |`,
    `| UI files with inline iframes | ${bypasses.length} |`,
    "",
    "## Coverage by surface",
    "",
    "| Surface | Total | Working | % |",
    "|---------|------:|--------:|--:|",
  ];

  for (const [surface, stats] of [...bySurface.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pct = stats.total ? Math.round((stats.working / stats.total) * 100) : 0;
    lines.push(`| ${surface} | ${stats.total} | ${stats.working} | ${pct}% |`);
  }

  lines.push("", "## Source resolution", "", "- **Sets**: YouTube (`youtubeId`) first, then Spotify fallback", "- **Tracks**: Spotify track URL → YouTube → Spotify album", "- **Releases**: Spotify embed", "- **Engine**: Single global iframe + optional HTML5 preview on `document.body`", "");

  if (bypasses.length > 0) {
    lines.push("## Components with inline iframes (potential bypass)", "");
    for (const file of bypasses) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  } else {
    lines.push("## Components bypassing global player", "", "No inline iframes found under `src/components/`.", "");
  }

  lines.push("## Failed entities (sample)", "");
  if (failedSample.length === 0) {
    lines.push("None — all audited entities have resolvable sources.", "");
  } else {
    lines.push("| Surface | Type | Title | Issue |");
    lines.push("|---------|------|-------|-------|");
    for (const f of failedSample) {
      lines.push(`| ${f.surface} | ${f.type} | ${f.title.replace(/\|/g, "/")} | ${f.issue ?? "—"} |`);
    }
    if (failed.length > failedSample.length) {
      lines.push("", `*…and ${failed.length - failedSample.length} more.*`, "");
    }
  }

  lines.push("## UI wiring (global `player.play()`)", "", "All playable surfaces route through `usePlaybackStore.play()` → `globalPlayerEngine.play()`:", "", "- `TrackRow` — tracks", "- `SetRow` — set cards", "- `SetCardEmbed` — artist/set detail thumbnails", "- `MusicActions` — play/pause buttons", "- `SearchResults` — track/set rows", "- `ListeningPath` — New here? Start here", "- `HistoryPlayRow` — library/history + continue listening", "- `PlaylistPageContent` — playlist rows", "- `EssentialSetOfDayHero` — featured set hero", "");

  writeFileSync(REPORT_PATH, lines.join("\n"));
  console.log(`Wrote ${REPORT_PATH}`);
  console.log({ total, working, failed: failed.length, bypasses: bypasses.length });
}

main();
