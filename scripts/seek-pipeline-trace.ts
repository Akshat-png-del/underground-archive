/**
 * Capture full [TRACE] seek pipeline logs after a real seek gesture.
 *
 * Usage (dev server must be running):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/seek-pipeline-trace.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_JSON = join(process.cwd(), "reports/seek-pipeline-trace.json");
const REPORT_MD = join(process.cwd(), "reports/seek-pipeline-trace.md");

interface TraceLine {
  tMs: number;
  type: string;
  text: string;
}

function parseTrace(text: string): Record<string, unknown> | null {
  const m = text.match(/^\[TRACE\] (.+?) (ENTER|EXIT|EARLY_RETURN|INVOKE|BRANCH|STATE|NATIVE|GUARD|LISTENER)(?:\s+(.+))?$/);
  if (!m) {
    const block = text.match(/^\[TRACE\] (.+?)\s+(\{.+)$/);
    if (block) {
      try {
        return { fn: block[1], raw: JSON.parse(block[2]) };
      } catch {
        return { fn: block[1], raw: block[2] };
      }
    }
    return null;
  }
  const [, fn, kind, rest] = m;
  let payload: Record<string, unknown> = { fn, kind };
  if (rest) {
    try {
      payload = { ...payload, ...JSON.parse(rest) };
    } catch {
      payload.raw = rest;
    }
  }
  return payload;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs: TraceLine[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[TRACE]") || text.includes("[SESSION]") || text.includes("[SEEK]")) {
      logs.push({ tMs: Date.now() - t0, type: msg.type(), text });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem("vf:seek-trace", "1");
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

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const row = page.locator('[id^="track-"]').first();
  await row.click();
  await page.waitForTimeout(5000);

  await page.waitForSelector("[data-audio-player], .sb-slider, .player-seek", { timeout: 20000 });

  const sbCount = await page.locator(".sb-slider").count();
  const seek = sbCount > 0 ? page.locator(".sb-slider") : page.locator(".player-seek");
  await seek.waitFor({ state: "visible", timeout: 10000 });

  const box = await seek.boundingBox();
  if (!box) throw new Error("seek bar not found");

  const clickX = box.x + box.width * 0.5;
  const clickY = box.y + box.height / 2;

  // Mark seek attempt boundary in logs
  logs.push({ tMs: Date.now() - t0, type: "marker", text: "=== SEEK GESTURE START (element.dispatchEvent pointerdown/up) ===" });

  // Use element-bound pointer events (closer to real user interaction)
  await seek.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
    clientX: clickX,
    clientY: clickY,
    bubbles: true,
    cancelable: true,
  });
  await page.waitForTimeout(30);
  await seek.dispatchEvent("input", { bubbles: true });
  await page.waitForTimeout(30);
  await seek.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    buttons: 0,
    clientX: clickX,
    clientY: clickY,
    bubbles: true,
    cancelable: true,
  });

  logs.push({ tMs: Date.now() - t0, type: "marker", text: "=== SEEK GESTURE END ===" });

  await page.waitForTimeout(2000);

  // Also try window-level mouse up (Playwright style) as second scenario marker
  logs.push({ tMs: Date.now() - t0, type: "marker", text: "=== SECOND GESTURE: page.mouse down/up at 75% ===" });
  const clickX2 = box.x + box.width * 0.75;
  await page.mouse.move(clickX2, clickY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(1500);

  const post = await page.evaluate(() => {
    const w = window as Window & { __seekReproSample?: () => Record<string, unknown> };
    return w.__seekReproSample?.() ?? null;
  });

  await browser.close();

  const traceEntries = logs
    .filter((l) => l.text.includes("[TRACE]"))
    .map((l) => ({ tMs: l.tMs, parsed: parseTrace(l.text.split("\nstack:")[0]), raw: l.text }));

  const entered = new Set<string>();
  const skipped = new Set<string>();
  const earlyReturns: { tMs: number; fn: string; raw: string }[] = [];
  const invocations: { tMs: number; from: string; to: string }[] = [];

  for (const entry of traceEntries) {
    const p = entry.parsed;
    if (!p) continue;
    const fn = String(p.fn ?? "");
    const kind = String(p.kind ?? "");
    if (kind === "ENTER") entered.add(fn);
    if (kind === "EXIT") {
      /* noop */
    }
    if (kind === "EARLY_RETURN") earlyReturns.push({ tMs: entry.tMs, fn, raw: entry.raw });
    if (kind === "INVOKE") {
      invocations.push({ tMs: entry.tMs, from: fn, to: String(p.next ?? "?") });
    }
  }

  const pipelineFns = [
    "PlaybackSeekBar.handlePointerDown",
    "PlaybackSeekBar.handlePointerMove",
    "PlaybackSeekBar.handlePreviewMove",
    "PlaybackSeekBar.attachPointerEndListeners",
    "PlaybackSeekBar.onPointerEnd",
    "PlaybackSeekBar.windowPointerEnd",
    "PlaybackSeekBar.commitDragSeek",
    "MediaSessionController.beginSeek",
    "MediaSessionController.updateSeek",
    "MediaSessionController.seek",
    "MediaSessionController.commitSeek",
    "GlobalPlayerEngine.seek",
    "ProviderRouter.seek",
    "SpotifyProvider.seek",
    "AudioProvider.seek",
    "YoutubeProvider.seek",
  ];

  for (const fn of pipelineFns) {
    if (!entered.has(fn)) skipped.add(fn);
  }

  const lastExecuted = [...traceEntries].reverse().find((e) => e.parsed?.kind === "ENTER" || e.parsed?.kind === "EXIT");
  const firstMissing = pipelineFns.find((fn) => !entered.has(fn));

  const md: string[] = [
    "# Seek Pipeline Runtime Trace",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Post-seek state",
    "",
    "```json",
    JSON.stringify(post, null, 2),
    "```",
    "",
    "## Summary",
    "",
    `- Trace lines captured: ${traceEntries.length}`,
    `- Functions ENTERED: ${entered.size}`,
    `- Functions NEVER ENTERED: ${skipped.size}`,
    `- Early returns: ${earlyReturns.length}`,
    `- Last ENTER/EXIT: ${lastExecuted?.parsed?.fn ?? "none"} @ t+${lastExecuted?.tMs ?? "?"}ms`,
    `- First pipeline fn never entered: ${firstMissing ?? "none (all entered)"}`,
    "",
    "## Functions entered",
    "",
    ...[...entered].sort().map((f) => `- ${f}`),
    "",
    "## Functions never entered",
    "",
    ...[...skipped].sort().map((f) => `- ${f}`),
    "",
    "## Early returns",
    "",
    ...(earlyReturns.length
      ? earlyReturns.map((e) => `- t+${e.tMs}ms **${e.fn}**\n  \`${e.raw.slice(0, 200)}\``)
      : ["_none_"]),
    "",
    "## Invocation chain",
    "",
    ...(invocations.length
      ? invocations.map((i) => `- t+${i.tMs}ms ${i.from} → ${i.to}`)
      : ["_none_"]),
    "",
    "## Full timeline (chronological)",
    "",
  ];

  for (const log of logs) {
    md.push(`- t+${String(log.tMs).padStart(5)}ms [${log.type}] ${log.text.replace(/\n/g, " ")}`);
  }

  writeFileSync(
    REPORT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        post,
        entered: [...entered],
        skipped: [...skipped],
        earlyReturns,
        invocations,
        lastExecuted,
        firstMissing,
        logs,
        traceEntries,
      },
      null,
      2,
    ),
  );
  writeFileSync(REPORT_MD, md.join("\n"));

  console.log(`Reports written:\n  ${REPORT_JSON}\n  ${REPORT_MD}`);
  console.log(`Trace lines: ${traceEntries.length}`);
  console.log(`Entered: ${entered.size} | Skipped: ${skipped.size} | Early returns: ${earlyReturns.length}`);
  if (firstMissing) console.log(`First never-entered: ${firstMissing}`);
  for (const er of earlyReturns) {
    console.log(`EARLY_RETURN t+${er.tMs}ms ${er.fn}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
