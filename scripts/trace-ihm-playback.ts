/**
 * Trace I Hate Models → Intergalactic Emotional Breakdown click → audio pipeline.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/trace-ihm-playback.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TRACK_ID = "i-hate-models::intergalactic-emotional-breakdown";
const REPORT = join(process.cwd(), "reports/ihm-playback-trace.md");

interface Stage {
  stage: string;
  passed: boolean;
  detail: string;
}

const stages: Stage[] = [];
const logs: string[] = [];

function stage(name: string, passed: boolean, detail: string) {
  stages.push({ stage, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${name}] ${detail}`);
}

async function dismissModals(page: import("playwright").Page) {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator(
      'button:has-text("Skip"), button:has-text("Got it"), button:has-text("Continue")',
    );
    if ((await btn.count()) === 0) break;
    await btn.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (/^\[(CLICK|STORE|ENGINE|SOURCE|EMBED|AUDIO|MOUNT|DOM|LISTENER|TRACK)\]/.test(text)) {
      logs.push(text);
    }
  });

  await page.goto(`${BASE_URL}/artists/i-hate-models`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);

  const row = page.locator(`#track-${TRACK_ID.replace(/::/g, "\\:\\:")}`);
  const rowAlt = page.locator(`[id="track-${TRACK_ID}"]`);
  const target = (await row.count()) > 0 ? row : rowAlt;

  const rowExists = (await target.count()) > 0;
  stage("CLICK", rowExists, rowExists ? `track row found: #track-${TRACK_ID}` : "track row missing");

  if (!rowExists) {
    await browser.close();
    writeReport();
    process.exit(1);
  }

  await target.scrollIntoViewIfNeeded();

  const beforeClick = Date.now();
  await target.click({ timeout: 5000 });
  await page.waitForTimeout(4000);

  const clickLogs = logs.filter((l) => l.includes("[CLICK]") && logs.indexOf(l) >= 0);
  const hasClickLog = logs.some((l) => l.includes("[CLICK]"));
  stage(
    "CLICK",
    hasClickLog,
    hasClickLog ? `click logs captured (${clickLogs.length})` : "no [CLICK] logs after pointer click",
  );

  const storeState = await page.evaluate(() => {
    const w = window as Window & { __playbackDebugDump?: () => Record<string, unknown> };
    return w.__playbackDebugDump?.() ?? null;
  });

  const currentTrack = (storeState?.store as { currentTrack?: string | null })?.currentTrack ?? null;
  const isPlaying = (storeState?.store as { isPlaying?: boolean })?.isPlaying ?? false;
  const isLoading = (storeState?.store as { isLoading?: boolean })?.isLoading ?? false;
  const error = (storeState?.store as { error?: string | null })?.error ?? null;

  stage(
    "STORE",
    currentTrack === TRACK_ID,
    `currentTrack=${currentTrack ?? "null"} isPlaying=${isPlaying} isLoading=${isLoading} error=${error ?? "null"}`,
  );

  const dom = storeState?.dom as {
    iframePresent?: boolean;
    iframeSrc?: string | null;
    audioPresent?: boolean;
    globalPlayerPresent?: boolean;
  } | null;

  const hasEngineLog = logs.some((l) => l.includes("[ENGINE]"));
  stage(
    "ENGINE",
    hasEngineLog && !!dom?.iframePresent,
    `engine logs=${hasEngineLog} iframe=${dom?.iframePresent} globalPlayer=${dom?.globalPlayerPresent}`,
  );

  const iframeSrc = dom?.iframeSrc ?? "";
  const isSpotify = iframeSrc.includes("open.spotify.com/embed");
  stage(
    "SOURCE",
    isSpotify,
    isSpotify ? `iframe src: ${iframeSrc.slice(0, 120)}` : `unexpected src: ${iframeSrc || "empty"}`,
  );

  const audibility = storeState?.audibility as {
    audibilityRisk?: string[];
    checks?: { autoplayInUrl?: boolean; opacityZero?: boolean };
  } | null;

  stage(
    "EMBED",
    !!dom?.iframePresent && iframeSrc !== "about:blank",
    `risks=${audibility?.audibilityRisk?.join(", ") || "none"} autoplay=${audibility?.checks?.autoplayInUrl}`,
  );

  stage(
    "AUDIO",
    isPlaying && !isLoading && !error,
    isPlaying
      ? "store reports isPlaying after embed load"
      : `not playing — isLoading=${isLoading} error=${error}`,
  );

  await browser.close();
  writeReport();
  process.exit(stages.every((s) => s.passed) ? 0 : 1);
}

function writeReport() {
  const md = `# IHM Playback Trace

Track: I Hate Models → Intergalactic Emotional Breakdown (\`${TRACK_ID}\`)

## Stages

| Stage | Result | Detail |
|-------|--------|--------|
${stages.map((s) => `| ${s.stage} | ${s.passed ? "PASS" : "FAIL"} | ${s.detail.replace(/\|/g, "\\|")} |`).join("\n")}

## Console pipeline logs

\`\`\`
${logs.join("\n") || "(none)"}
\`\`\`
`;
  writeFileSync(REPORT, md);
  console.log(`\nReport: ${REPORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
