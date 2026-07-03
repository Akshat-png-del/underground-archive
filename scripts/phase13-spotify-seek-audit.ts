/**
 * Phase 13 — Spotify provider seek root-cause capture (read-only analysis script).
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/phase13-spotify-seek-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_MD = join(process.cwd(), "reports/phase13-spotify-seek-audit.md");
const OUT_JSON = join(process.cwd(), "reports/phase13-spotify-seek-audit.json");
const CAPTURE_MS = 8000;

interface LogLine {
  tMs: number;
  text: string;
}

function parseObj(text: string): Record<string, unknown> {
  const brace = text.indexOf("{");
  if (brace === -1) return {};
  const inner = text.slice(brace + 1, text.lastIndexOf("}"));
  const out: Record<string, unknown> = {};
  const re = /(\w+):\s*([^,}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const key = m[1];
    const raw = m[2].trim();
    if (raw === "null") out[key] = null;
    else if (raw === "true") out[key] = true;
    else if (raw === "false") out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
    else out[key] = raw;
  }
  return out;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs: LogLine[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("[SPOTIFY-SEEK-AUDIT]") ||
      text.includes("[TRACE]") ||
      text.includes("[SESSION] commitSeek") ||
      text.includes("[PROVIDER SEEK]") ||
      text.includes("[COMMAND]")
    ) {
      logs.push({ tMs: Date.now() - t0, text });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:spotify-seek-audit", "1");
    localStorage.setItem("vf:seek-trace", "1");
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem(
      "underground-archive-preferences-v1",
      JSON.stringify({
        favoriteArtists: [],
        favoriteGenres: [],
        favoriteMoods: [],
        bpmRange: [130, 150],
        completedAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(6000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });

  const box = await page.locator(".sb-slider").boundingBox();
  if (!box) throw new Error("slider not found");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(box.x + box.width * 0.55, y, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.up();

  const commitExit = await (async () => {
    for (let i = 0; i < 50; i++) {
      const hit = logs.find((l) => l.text.includes("MediaSessionController.commitSeek EXIT"));
      if (hit) return hit;
      await page.waitForTimeout(100);
    }
    return logs.find((l) => l.text.includes("MediaSessionController.commitSeek EXIT"));
  })();

  if (!commitExit) throw new Error("commitSeek EXIT not observed");

  const anchorTMs = commitExit.tMs;
  const seekTarget = parseObj(commitExit.text).target ?? 16;
  await page.waitForTimeout(CAPTURE_MS);
  await browser.close();

  const windowLogs = logs.filter((l) => l.tMs >= anchorTMs - 200 && l.tMs <= anchorTMs + CAPTURE_MS);

  const spotifyLogs = windowLogs.filter((l) => l.text.includes("[SPOTIFY-SEEK-AUDIT]"));
  const routerLogs = windowLogs.filter(
    (l) =>
      l.text.includes("ProviderRouter") ||
      l.text.includes("GlobalPlayerEngine.seek") ||
      l.text.includes("SpotifyProvider.seek"),
  );

  const postSeek500 = windowLogs.filter(
    (l) => l.tMs >= anchorTMs && l.tMs <= anchorTMs + 500,
  );

  const commandsAfterSeek = postSeek500.filter(
    (l) =>
      l.text.includes("COMMAND") ||
      (l.text.includes("ProviderRouter") &&
        (l.text.includes("play") ||
          l.text.includes("resume") ||
          l.text.includes("load") ||
          l.text.includes("pause"))),
  );

  const playbackUpdates = spotifyLogs.filter((l) => l.text.includes("PLAYBACK_UPDATE"));
  const firstDiverge = playbackUpdates.find((l) => {
    const o = parseObj(l.text);
    const pos = o.position;
    return typeof pos === "number" && Math.abs(pos - Number(seekTarget)) > 0.25;
  });

  const hostSeekReturned = spotifyLogs.find((l) =>
    l.text.includes("controller_seek_returned"),
  );
  const hostSeekThrew = spotifyLogs.find((l) => l.text.includes("controller_seek_threw"));
  const sdkErrors = spotifyLogs.filter(
    (l) => l.text.includes("playback_error") || l.text.includes("exception"),
  );

  const timeline: string[] = [];
  const markers = [
    { match: "commitSeek EXIT", label: "commitSeek EXIT" },
    { match: "GlobalPlayerEngine.seek", label: "GlobalPlayerEngine.seek" },
    { match: "ProviderRouter.seek", label: "ProviderRouter.seek" },
    { match: "SpotifyProvider SEEK", label: "SpotifyProvider.seek" },
    { match: "HOST_SEEK", label: "host.seekIfReady" },
    { match: "controller_seek_returned", label: "SDK controller.seek() returned" },
    { match: "PLAYBACK_UPDATE", label: "playback_update" },
    { match: "SDK_CALLBACK", label: "SDK callback" },
    { match: "STATE_PATCH", label: "provider state patch" },
  ];

  for (const log of windowLogs) {
    for (const m of markers) {
      if (log.text.includes(m.match)) {
        timeline.push(`t+${log.tMs - anchorTMs}ms — ${m.label}: ${log.text.slice(0, 180)}`);
        break;
      }
    }
  }

  const positions = playbackUpdates.map((l) => {
    const o = parseObj(l.text);
    return {
      tMs: l.tMs - anchorTMs,
      position: o.position,
      followsSeek: o.followsSeek,
      msSinceSeek: o.msSinceSeek,
    };
  });

  const md = [
    "# Phase 13 — Spotify Provider Root Cause Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Seek target: **${seekTarget}s**`,
    `Capture: **${CAPTURE_MS}ms** after commitSeek EXIT`,
    "",
    "## Timeline",
    "",
    ...timeline.map((l) => `- ${l}`),
    "",
    "## playback_update positions after seek",
    "",
    "| t+ms | position | followsSeek | msSinceSeek |",
    "|------|----------|-------------|-------------|",
    ...positions.map(
      (p) => `| ${p.tMs} | ${p.position ?? "?"} | ${p.followsSeek ?? "?"} | ${p.msSinceSeek ?? "?"} |`,
    ),
    "",
    "## Commands within 500ms after seek (router + provider)",
    "",
    ...(commandsAfterSeek.length
      ? commandsAfterSeek.map((l) => `- t+${l.tMs - anchorTMs}ms ${l.text.slice(0, 200)}`)
      : ["_none observed_"]),
    "",
    "## Explicit answers (runtime evidence only)",
    "",
    `**Did Spotify receive the requested seek?** ${
      hostSeekReturned
        ? `YES — controller.seek(${parseObj(hostSeekReturned.text).positionMs ?? "?"}ms) returned without throw`
        : hostSeekThrew
          ? `THREW — ${hostSeekThrew.text.slice(0, 150)}`
          : "NO EVIDENCE — host.seekIfReady early return or not logged"
    }`,
    "",
    `**Did seek() return success?** ${
      hostSeekReturned ? "YES (synchronous return, no exception)" : hostSeekThrew ? "NO (exception)" : "UNKNOWN"
    }`,
    "",
    `**Did another command execute within 500ms after seek?** ${
      commandsAfterSeek.filter((l) => !l.text.includes("seek") && !l.text.includes("SEEK")).length
        ? "YES — see commands list above"
        : "NO — no play/resume/load/pause command logged within 500ms"
    }`,
    "",
    `**Which playback_update first diverges from ${seekTarget}s?** ${
      firstDiverge
        ? `t+${firstDiverge.tMs - anchorTMs}ms position=${parseObj(firstDiverge.text).position}`
        : "None within capture (or no playback_update events)"
    }`,
    "",
    `**Is provider emitting 29.713 or wrapper transforming?** See STATE_PATCH vs PLAYBACK_UPDATE — if PLAYBACK_UPDATE raw payload shows position=29713ms, **SDK emits it**; if only STATE_PATCH from seek_optimistic_patch, **provider local patch**`,
    "",
    `**SDK rejecting seek or accepting then overriding?** ${
      hostSeekReturned && firstDiverge
        ? "Accepting seek call synchronously, then playback_update overrides position later"
        : "Insufficient evidence"
    }`,
    "",
    `**Spotify error ignored?** ${sdkErrors.length ? sdkErrors.map((l) => l.text.slice(0, 120)).join("; ") : "No playback_error or exception logged"}`,
    "",
    "## Full Spotify audit log",
    "",
    ...spotifyLogs.map((l) => `- t+${String(l.tMs - anchorTMs).padStart(5)}ms ${l.text.replace(/\n/g, " ")}`),
  ];

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seekTarget,
        anchorTMs,
        windowLogs,
        spotifyLogs,
        routerLogs,
        commandsAfterSeek,
        positions,
        timeline,
        hostSeekReturned: hostSeekReturned?.text ?? null,
        hostSeekThrew: hostSeekThrew?.text ?? null,
        firstDiverge: firstDiverge?.text ?? null,
      },
      null,
      2,
    ),
  );
  writeFileSync(OUT_MD, md.join("\n"));
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Spotify audit lines: ${spotifyLogs.length}, playback_updates: ${playbackUpdates.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
