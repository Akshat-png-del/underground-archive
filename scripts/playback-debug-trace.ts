/**
 * Capture full playback pipeline console logs after a real track click.
 *
 * Usage (dev server must be running):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/playback-debug-trace.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogTracks } from "../src/content/tracks";
import { analyzePlaybackItem } from "../src/lib/music/playback-source";
import { playbackItemFromTrack } from "../src/lib/music/playback";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_PATH = join(process.cwd(), "reports/playback-debug-trace.md");

interface LogLine {
  type: string;
  text: string;
  ts: number;
}

function findPlayableTrack() {
  for (const track of catalogTracks) {
    const item = playbackItemFromTrack(track);
    const analysis = analyzePlaybackItem(item);
    if (analysis.playable) {
      const id = track.id || `${track.artistSlug}-${track.title}`;
      return { track, item, analysis, id };
    }
  }
  return null;
}

function parseStep(text: string): string | null {
  const m = text.match(/^\[(CLICK|TRACK|STORE|ENGINE|MOUNT|DOM|SOURCE|RACE|LISTENER)\]/);
  return m?.[1] ?? null;
}

function analyzeChain(logs: LogLine[]): {
  steps: Record<string, boolean>;
  lastStep: string | null;
  stopPoint: string;
  logs: string[];
} {
  const steps = {
    click: false,
    track: false,
    storeDispatch: false,
    storeUpdated: false,
    enginePlayRequested: false,
    sourceResolved: false,
    engineRouted: false,
    domCreated: false,
    iframeSrcSet: false,
    playSuccess: false,
    listenerPatch: false,
    playFailed: false,
  };

  const lines: string[] = [];
  let lastStep: string | null = null;

  for (const log of logs) {
    if (log.type !== "log" && log.type !== "warn" && log.type !== "error") continue;
    const step = parseStep(log.text);
    if (!step && !log.text.includes("[CLICK]") && !log.text.includes("[ENGINE]")) continue;
    lines.push(`[${log.type}] ${log.text}`);

    if (log.text.includes("[CLICK]")) steps.click = true;
    if (log.text.includes("[TRACK]")) steps.track = true;
    if (log.text.includes("[STORE] play() action dispatched")) steps.storeDispatch = true;
    if (log.text.includes("[STORE] state updated")) steps.storeUpdated = true;
    if (log.text.includes("[ENGINE] play requested")) steps.enginePlayRequested = true;
    if (log.text.includes("[SOURCE] resolved")) steps.sourceResolved = true;
    if (
      log.text.includes("routing to embed iframe") ||
      log.text.includes("routing to HTML5 audio") ||
      log.text.includes("setting iframe.src")
    ) {
      steps.engineRouted = true;
    }
    if (log.text.includes("[MOUNT] engine mounted") || log.text.includes("post-init probe")) {
      steps.domCreated = true;
    }
    if (log.text.includes("setting iframe.src") || log.text.includes("after iframe.src set")) {
      steps.iframeSrcSet = true;
    }
    if (
      log.text.includes("play success") ||
      log.text.includes("embed load success") ||
      log.text.includes("audio event: play")
    ) {
      steps.playSuccess = true;
    }
    if (log.text.includes("[LISTENER]")) steps.listenerPatch = true;
    if (log.text.includes("play failed") || log.text.includes("embed load failed")) {
      steps.playFailed = true;
    }

    if (step) lastStep = `${step}: ${log.text.replace(/^\[[^\]]+\]\s*/, "")}`;
  }

  let stopPoint = "UNKNOWN — no pipeline logs captured";
  if (steps.playFailed) stopPoint = "ENGINE — play failed (see error log)";
  else if (steps.playSuccess) stopPoint = "COMPLETE — engine reported play success";
  else if (steps.iframeSrcSet && !steps.playSuccess)
    stopPoint = "ENGINE — iframe src set but embed load / play success never fired";
  else if (steps.engineRouted && !steps.iframeSrcSet)
    stopPoint = "ENGINE — routed to embed/audio but DOM src never set";
  else if (steps.sourceResolved && !steps.engineRouted)
    stopPoint = "ENGINE — source resolved but no audio/embed route";
  else if (steps.enginePlayRequested && !steps.sourceResolved)
    stopPoint = "ENGINE — play requested but source not resolved";
  else if (steps.storeUpdated && !steps.enginePlayRequested)
    stopPoint = "STORE — state updated but engine.play() never logged";
  else if (steps.storeDispatch && !steps.storeUpdated)
    stopPoint = "STORE — play() dispatched but state not updated (early return?)";
  else if (steps.click && !steps.storeDispatch) stopPoint = "CLICK — handler fired but store.play() not reached";
  else if (!steps.click) stopPoint = "CLICK — handler never fired";

  return { steps, lastStep, stopPoint, logs: lines };
}

async function main(): Promise<void> {
  const playable = findPlayableTrack();
  if (!playable) {
    writeFileSync(REPORT_PATH, "# Playback Debug Trace\n\nFAIL: No playable track in catalog.\n");
    console.error("No playable track found");
    process.exit(1);
  }

  const { track, item, analysis, id } = playable;
  const url = `/genres/hard-techno`;
  const logs: LogLine[] = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    logs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
  });

  await page.addInitScript(() => {
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
    localStorage.setItem("vf:playback-debug", "1");
  });

  await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle", timeout: 60000 });

  // Pre-click state
  const preInit = await page.evaluate(() => {
    const root = document.getElementById("vitalforge-playback-root");
    return {
      playbackRootMounted: !!root,
      globalPlayerPresent: !!document.querySelector('[aria-label="Now playing"]'),
      iframeSrc: root?.querySelector("iframe")?.getAttribute("src") ?? null,
    };
  });

  const row = page.locator(`[id="track-${id}"]`);
  const rowCount = await row.count();
  const fallbackRow = page.locator('[id^="track-"]').first();
  const target = rowCount > 0 ? row : fallbackRow;
  const clickedId =
    rowCount > 0 ? id : (await fallbackRow.getAttribute("id"))?.replace(/^track-/, "") ?? id;

  await target.scrollIntoViewIfNeeded();
  const playBtn = target.locator('button[aria-label^="Play"]').first();
  await playBtn.click({ timeout: 10000 });

  await page.waitForTimeout(4000);

  const postClick = await page.evaluate(() => {
    const w = window as Window & { __playbackDebugDump?: () => Record<string, unknown> };
    const dump = w.__playbackDebugDump?.() ?? null;
    const root = document.getElementById("vitalforge-playback-root");
    const iframe = root?.querySelector("iframe");
    const audio = root?.querySelector("audio");
    return {
      dump,
      dom: {
        rootPresent: !!root,
        iframePresent: !!iframe,
        audioPresent: !!audio,
        iframeSrc: iframe?.getAttribute("src") ?? null,
        audioSrc: audio?.getAttribute("src") ?? (audio as HTMLAudioElement | null)?.currentSrc ?? null,
        audioPaused: audio ? (audio as HTMLAudioElement).paused : null,
        globalPlayerPresent: !!document.querySelector('[aria-label="Now playing"]'),
        pauseButtonVisible:
          document.querySelectorAll('[aria-label="Now playing"] [aria-label="Pause"]').length > 0,
        loadingVisible: document.body.innerText.includes("Loading…"),
      },
    };
  });

  const chain = analyzeChain(logs.filter((l) => l.ts > 0));

  const report = [
    "# Playback Debug Trace Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    `Test page: ${url}`,
    "",
    "## Test track",
    "",
    `- Title: ${track.title}`,
    `- Artist: ${track.artist}`,
    `- Track ID: ${clickedId}`,
    `- Source kind: ${analysis.kind}`,
    `- Embed URL: ${analysis.embedUrl ?? "none"}`,
    `- Playable: ${analysis.playable}`,
    "",
    "## Pre-click checks",
    "",
    `| Check | Result |`,
    `|-------|--------|`,
    `| Playback DOM root present | ${preInit.playbackRootMounted} |`,
    `| Global player visible | ${preInit.globalPlayerPresent} |`,
    `| Iframe src (pre-click) | ${preInit.iframeSrc ?? "null"} |`,
    "",
    "## Execution chain (10 verification points)",
    "",
    `| # | Check | Pass |`,
    `|---|-------|------|`,
    `| 1 | Click handler firing | ${chain.steps.click} |`,
    `| 2 | play(track) / playNow called | ${chain.steps.track && chain.steps.storeDispatch} |`,
    `| 3 | Zustand play() executing | ${chain.steps.storeDispatch} |`,
    `| 4 | Engine receiving track | ${chain.steps.enginePlayRequested} |`,
    `| 5 | Global player mounted | ${postClick.dom.globalPlayerPresent} |`,
    `| 6 | Audio/iframe in DOM | ${postClick.dom.iframePresent || postClick.dom.audioPresent} |`,
    `| 7 | Source URL valid | ${!!analysis.embedUrl || analysis.kind === "preview"} |`,
    `| 8 | Player survives navigation | N/A (single-page click test) |`,
    `| 9 | Race guards cancelling | ${logs.some((l) => l.text.includes("[RACE]")) ? "YES — see logs" : "NO"} |`,
    `| 10 | Immediate stop after play | ${logs.some((l) => l.text.includes("stop requested") && l.ts > logs.find((x) => x.text.includes("play requested"))?.ts!) ? "YES" : "NO"} |`,
    "",
    "## Chain stop point",
    "",
    `**${chain.stopPoint}**`,
    "",
    chain.lastStep ? `Last pipeline log: \`${chain.lastStep}\`` : "",
    "",
    "## Post-click DOM state",
    "",
    "```json",
    JSON.stringify(postClick, null, 2),
    "```",
    "",
    "## Console pipeline logs",
    "",
    chain.logs.length
      ? chain.logs.map((l) => `- ${l}`).join("\n")
      : "_No [CLICK]/[STORE]/[ENGINE] logs captured — is dev server running latest code?_",
    "",
    "## Verdict",
    "",
  ];

  const audibleLikely =
    chain.steps.playSuccess &&
    postClick.dom.globalPlayerPresent &&
    (postClick.dom.pauseButtonVisible ||
      (postClick.dom.iframeSrc && !postClick.dom.iframeSrc.includes("about:blank")));

  if (audibleLikely) {
    report.push(
      "Pipeline reaches engine play success and DOM shows active embed/audio. **Automated trace PASS** for pipeline completion.",
      "",
      "Note: Headless Chromium cannot confirm audible output. Manual browser verification still required for Spotify/YouTube embed autoplay policy.",
    );
  } else {
    report.push(
      "**FAIL** — Playback chain does not complete. User would not hear audio.",
      "",
      "See chain stop point and console logs above.",
    );
  }

  writeFileSync(REPORT_PATH, report.join("\n"));
  console.log(`Report written to ${REPORT_PATH}`);
  console.log(`Stop point: ${chain.stopPoint}`);
  console.log(`Play success: ${chain.steps.playSuccess}`);
  console.log(`Iframe src: ${postClick.dom.iframeSrc}`);

  await browser.close();
  process.exit(audibleLikely ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
