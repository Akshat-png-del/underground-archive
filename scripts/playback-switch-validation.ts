/**
 * Validates track/set switching — Spotify-like single-player behavior.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/playback-switch-validation.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getTracksByArtist } from "../src/content/tracks";
import { getSetsByArtist } from "../src/content/sets";
import { playbackItemFromTrack, playbackItemFromSet } from "../src/lib/music/playback";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT = join(process.cwd(), "reports/playback-switch-fix.md");

interface Row {
  test: string;
  passed: boolean;
  detail: string;
}

const rows: Row[] = [];
const playerLogs: string[] = [];

function record(test: string, passed: boolean, detail: string) {
  rows.push({ test, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${test}: ${detail}`);
}

async function dismissModals(page: import("playwright").Page) {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button:has-text("Skip"), button:has-text("Got it"), button:has-text("Continue")');
    if ((await btn.count()) === 0) break;
    await btn.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function clickTrack(page: import("playwright").Page, trackId: string) {
  const row = page.locator(`[id="track-${trackId}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.click({ timeout: 5000 });
  await page.waitForTimeout(2500);
}

async function getState(page: import("playwright").Page) {
  return page.evaluate(() => {
    const w = window as Window & { __playbackDebugDump?: () => Record<string, unknown> };
    const dump = w.__playbackDebugDump?.();
    const store = dump?.store as {
      currentTrack?: string | null;
      isPlaying?: boolean;
      error?: string | null;
    } | undefined;
    const dom = dump?.dom as { iframeSrc?: string | null; iframeCount?: number } | undefined;
    const root = document.getElementById("vitalforge-playback-root");
    const iframes = root?.querySelectorAll("iframe").length ?? 0;
    const audios = root?.querySelectorAll("audio").length ?? 0;
    return {
      currentTrack: store?.currentTrack ?? null,
      isPlaying: store?.isPlaying ?? false,
      error: store?.error ?? null,
      iframeSrc: dom?.iframeSrc ?? root?.querySelector("iframe")?.getAttribute("src") ?? null,
      iframeCount: iframes,
      audioCount: audios,
    };
  });
}

async function main() {
  const saraTrack = getTracksByArtist("sara-landry")[0];
  const kobosilTrack = getTracksByArtist("kobosil")[0];
  const ihmTrack = getTracksByArtist("i-hate-models")[0];
  const kobosilSet = getSetsByArtist("kobosil")[0];

  if (!saraTrack || !kobosilTrack || !ihmTrack || !kobosilSet) {
    console.error("Missing catalog fixtures");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("[PLAYER]")) playerLogs.push(t);
  });

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);

  // Sara → Kobosil (different artist pages)
  await clickTrack(page, saraTrack.id);
  let s1 = await getState(page);
  record(
    "Sara Landry track plays",
    s1.currentTrack === saraTrack.id && s1.isPlaying,
    `${s1.currentTrack} playing=${s1.isPlaying}`,
  );

  await page.goto(`${BASE_URL}/artists/kobosil`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);
  await clickTrack(page, kobosilTrack.id);
  let s2 = await getState(page);
  record(
    "Kobosil replaces Sara",
    s2.currentTrack === kobosilTrack.id && s2.isPlaying && s2.currentTrack !== saraTrack.id,
    `${s2.currentTrack} iframe=${s2.iframeSrc?.slice(0, 60)}`,
  );

  await page.goto(`${BASE_URL}/artists/i-hate-models`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);
  await clickTrack(page, ihmTrack.id);
  let s3 = await getState(page);
  record(
    "I Hate Models replaces Kobosil",
    s3.currentTrack === ihmTrack.id && s3.isPlaying,
    s3.currentTrack ?? "null",
  );

  // Track → Set on Kobosil page
  await page.goto(`${BASE_URL}/artists/kobosil`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);
  await clickTrack(page, kobosilTrack.id);
  const setCard = page.locator("#essential-sets [role='button']").first();
  if ((await setCard.count()) > 0) {
    await setCard.scrollIntoViewIfNeeded();
    await setCard.click();
    await page.waitForTimeout(2500);
    const s4 = await getState(page);
    record(
      "Set replaces track",
      s4.currentTrack === kobosilSet.id && s4.isPlaying,
      `${s4.currentTrack} yt=${s4.iframeSrc?.includes("youtube") || s4.iframeSrc?.includes("spotify")}`,
    );

    await clickTrack(page, kobosilTrack.id);
    const s5 = await getState(page);
    record(
      "Track replaces set",
      s5.currentTrack === kobosilTrack.id && s5.isPlaying,
      s5.currentTrack ?? "null",
    );
  } else {
    record("Set replaces track", false, "no set card found");
    record("Track replaces set", false, "skipped");
  }

  // Rapid A→B→C→D on IHM page
  await page.goto(`${BASE_URL}/artists/i-hate-models`, { waitUntil: "domcontentloaded" });
  await dismissModals(page);
  const tracks = getTracksByArtist("i-hate-models").slice(0, 4);
  for (const t of tracks) {
    await clickTrack(page, t.id);
    await page.waitForTimeout(400);
  }
  const sRapid = await getState(page);
  const last = tracks[tracks.length - 1];
  record(
    "Rapid A→B→C→D — only D plays",
    sRapid.currentTrack === last.id && sRapid.isPlaying,
    `expected ${last.id} got ${sRapid.currentTrack}`,
  );

  record(
    "Single iframe instance",
    sRapid.iframeCount === 1 && sRapid.audioCount === 1,
    `iframes=${sRapid.iframeCount} audios=${sRapid.audioCount}`,
  );

  // Same track play/pause
  await clickTrack(page, last.id);
  let sPause = await getState(page);
  record("Same track click pauses", !sPause.isPlaying, `isPlaying=${sPause.isPlaying}`);

  await clickTrack(page, last.id);
  let sResume = await getState(page);
  record("Same track click resumes", sResume.isPlaying, `isPlaying=${sResume.isPlaying}`);

  await browser.close();

  const passed = rows.filter((r) => r.passed).length;
  const md = `# Playback Switch Fix Validation

Generated: ${new Date().toISOString()}

## Root cause

1. **Reused iframe/audio DOM** — switching tracks only changed \`iframe.src\`; old Spotify/YouTube embeds could keep playing.
2. **Stacked embed load listeners** — each \`play()\` added new handlers without removing old ones, causing race desync.
3. **Store/engine desync on pause** — store waited for async engine events while UI toggled immediately.

## Fix

- **Destroy and recreate** iframe + audio on every new \`play()\`, pause (embed), resume, and stop.
- **Clear embed listeners** before rebinding; generation token rejects stale callbacks.
- **Store pause** sets \`isPlaying: false\` optimistically before engine teardown.

## Files modified

- \`src/lib/music/global-player-engine.ts\`
- \`src/stores/playback-store.ts\`
- \`src/lib/music/playback-debug.ts\` (added \`[PLAYER]\` log tag)

## Results (${passed}/${rows.length})

| Test | Result | Detail |
|------|--------|--------|
${rows.map((r) => `| ${r.test} | ${r.passed ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|")} |`).join("\n")}

## [PLAYER] logs (sample)

\`\`\`
${playerLogs.slice(-20).join("\n") || "(none captured)"}
\`\`\`
`;

  writeFileSync(REPORT, md);
  console.log(`\nReport: ${REPORT}`);
  process.exit(rows.every((r) => r.passed) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
