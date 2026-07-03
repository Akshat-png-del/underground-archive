/**
 * Spotify + preview auto-next runtime audit — console + sample evidence.
 *
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/spotify-auto-next-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_JSON = join(process.cwd(), "reports/spotify-auto-next-audit.json");
const OUT_MD = join(process.cwd(), "reports/spotify-auto-next-audit.md");

type AuditEvent = { tMs: number; kind: string; detail: Record<string, unknown> };

async function sample(page: import("playwright").Page, label: string) {
  return page.evaluate((l) => {
    const w = window as Window & { __queueTraceSample?: (label?: string) => Record<string, unknown> };
    return w.__queueTraceSample?.(l) ?? { error: "hook missing" };
  }, label);
}

async function seekNearEnd(page: import("playwright").Page, fraction = 0.98): Promise<void> {
  const box = await page.locator(".sb-slider").boundingBox();
  if (!box) return;
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
}

function classifyConsole(text: string): string | null {
  if (text.includes("playback_update")) return "spotify-playback-update";
  if (text.includes("advanceQueueOnEnd") && text.includes("enter")) return "advanceQueueOnEnd-enter";
  if (text.includes("GlobalPlayerEngine.applyProviderState") && text.includes("onEnded"))
    return "engine-onEnded";
  if (text.includes("MediaSessionController.play") && text.includes("via_play")) return "msc-play";
  if (text.includes("ProviderRouter.play") && text.includes("enter")) return "provider-play-enter";
  if (text.includes("auto_advance")) return "auto-advance";
  if (text.includes("[ENGINE] play requested")) return "engine-play-requested";
  if (text.includes("preview ended")) return "preview-ended-log";
  if (text.includes("isPaused field present")) return "spotify-isPaused-patch";
  return null;
}

async function waitForAdvance(
  page: import("playwright").Page,
  startTrack: string | null,
  startIdx: number,
  maxPolls: number,
): Promise<{ afterEnd: Record<string, unknown>; advanced: boolean; polls: number }> {
  let afterEnd: Record<string, unknown> = {};
  for (let i = 0; i < maxPolls; i++) {
    await page.waitForTimeout(500);
    afterEnd = await sample(page, `poll-${i}`);
    const idx = (afterEnd.msc as { queueIndex?: number })?.queueIndex ?? 0;
    const track = (afterEnd.msc as { activeTrack?: string | null })?.activeTrack ?? null;
    const playing = (afterEnd.msc as { isPlaying?: boolean })?.isPlaying;
    if (track !== startTrack && idx === startIdx + 1) {
      return { afterEnd, advanced: true, polls: i + 1 };
    }
    if (track !== startTrack && idx !== startIdx) {
      return { afterEnd, advanced: track !== startTrack, polls: i + 1 };
    }
    // preview single-item queue may restart same ref — detect end via isPlaying cycle
    if (startIdx === 0 && playing === true && i > 2) {
      const ct = (afterEnd.msc as { currentTime?: number })?.currentTime ?? 0;
      if (ct < 1 && i > 5) return { afterEnd, advanced: false, polls: i + 1 };
    }
  }
  return { afterEnd, advanced: false, polls: maxPolls };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleEvents: AuditEvent[] = [];
  const t0 = Date.now();
  const tSeek = { spotify: 0, preview: 0 };

  page.on("console", (msg) => {
    const text = msg.text();
    const kind = classifyConsole(text);
    if (kind) {
      consoleEvents.push({ tMs: Date.now() - t0, kind, detail: { text: text.slice(0, 500) } });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:queue-trace", "1");
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem("vf:hydration-trace", "1");
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

  // ── Spotify ──
  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(5000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });

  const spotifyAfterPlay = await sample(page, "spotify-after-play");
  const spotifyStartTrack = (spotifyAfterPlay.msc as { activeTrack?: string })?.activeTrack ?? null;
  const spotifyStartIdx = (spotifyAfterPlay.msc as { queueIndex?: number })?.queueIndex ?? 0;
  const consoleBeforeSeek = consoleEvents.length;

  await seekNearEnd(page, 0.98);
  tSeek.spotify = Date.now() - t0;
  await page.waitForTimeout(1000);

  const spotifyAfterSeek = await sample(page, "spotify-after-seek");
  const spotifyWait = await waitForAdvance(page, spotifyStartTrack, spotifyStartIdx, 90);

  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { prev: () => void } };
    w.__queueAudit?.prev();
  });
  await page.waitForTimeout(3000);
  const spotifyAfterPrev = await sample(page, "spotify-after-prev");

  const spotifyConsoleAfterSeek = consoleEvents.slice(consoleBeforeSeek);

  // ── Preview ──
  const previewConsoleStart = consoleEvents.length;
  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { playPreview: () => void } };
    w.__hydrationAudit?.playPreview();
  });
  await page.waitForTimeout(4000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });

  const previewAfterPlay = await sample(page, "preview-after-play");
  const previewStartTrack = (previewAfterPlay.msc as { activeTrack?: string })?.activeTrack ?? null;
  const previewStartIdx = (previewAfterPlay.msc as { queueIndex?: number })?.queueIndex ?? 0;

  await seekNearEnd(page, 0.995);
  tSeek.preview = Date.now() - t0;
  await page.waitForTimeout(500);
  const previewWait = await waitForAdvance(page, previewStartTrack, previewStartIdx, 40);
  const previewConsoleAfterSeek = consoleEvents.slice(previewConsoleStart);

  await browser.close();

  const engineOnEnded = spotifyConsoleAfterSeek.filter((e) => e.kind === "engine-onEnded");
  const advanceAfterSpotifySeek = spotifyConsoleAfterSeek.filter(
    (e) => e.kind === "advanceQueueOnEnd-enter" && e.tMs >= tSeek.spotify,
  );
  const playAfterSpotifySeek = spotifyConsoleAfterSeek.filter(
    (e) => (e.kind === "msc-play" || e.kind === "engine-play-requested") && e.tMs >= tSeek.spotify,
  );
  const playbackUpdatesAfterSeek = spotifyConsoleAfterSeek.filter(
    (e) => e.kind === "spotify-playback-update" && e.tMs >= tSeek.spotify,
  );
  const pausedPatchesAfterSeek = spotifyConsoleAfterSeek.filter(
    (e) => e.kind === "spotify-isPaused-patch" && e.tMs >= tSeek.spotify,
  );

  const endTrack = (spotifyWait.afterEnd.msc as { activeTrack?: string })?.activeTrack;
  const endIdx = (spotifyWait.afterEnd.msc as { queueIndex?: number })?.queueIndex;
  const endPlaying = (spotifyWait.afterEnd.msc as { isPlaying?: boolean })?.isPlaying;
  const endTime = (spotifyWait.afterEnd.msc as { currentTime?: number })?.currentTime;
  const endDuration = (spotifyWait.afterEnd.engine as { mode?: string })?.mode;

  const answers = {
    q1_spotifyPlaybackUpdateAtEnd: playbackUpdatesAfterSeek.length > 0,
    q1_playbackUpdateCountAfterSeek: playbackUpdatesAfterSeek.length,
    q1_pausedAtEndSignals: pausedPatchesAfterSeek.length,
    q2_onEndedInferred: engineOnEnded.length >= 1,
    q2_onEndedCount: engineOnEnded.length,
    q3_advanceQueueOnEndCount: advanceAfterSpotifySeek.length,
    q4_playNextCountAfterSeek: playAfterSpotifySeek.length,
    q5_queueIndexPlusOne: endIdx === spotifyStartIdx + 1,
    q6_nextTrackAutoStart: spotifyWait.advanced && endPlaying === true,
    q7_duplicatePlay: playAfterSpotifySeek.length > 2,
    q8_skippedTracks: endIdx != null && endIdx > spotifyStartIdx + 1,
    q9_previewAutoNext: previewConsoleAfterSeek.some((e) => e.kind === "advanceQueueOnEnd-enter"),
    q10_prevWorksAfterAutoNext:
      ((spotifyAfterPrev.msc as { activeTrack?: string })?.activeTrack ?? null) != null,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    answers,
    spotify: {
      startTrack: spotifyStartTrack,
      startIdx: spotifyStartIdx,
      afterSeek: spotifyAfterSeek,
      afterEnd: spotifyWait.afterEnd,
      endTrack,
      endIdx,
      endPlaying,
      endTime,
      polls: spotifyWait.polls,
      advanced: spotifyWait.advanced,
      afterPrev: spotifyAfterPrev,
    },
    preview: {
      startTrack: previewStartTrack,
      afterPlay: previewAfterPlay,
      afterEnd: previewWait.afterEnd,
      advanced: previewWait.advanced,
    },
    consoleAfterSpotifySeek: spotifyConsoleAfterSeek,
    consoleAfterPreviewSeek: previewConsoleAfterSeek,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  const md = [
    "# Spotify Auto-Next Runtime Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Answers",
    "",
    ...Object.entries(answers).map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`),
    "",
    "## Spotify transition",
    "",
    `- Start: \`${spotifyStartTrack}\` @ index ${spotifyStartIdx}`,
    `- After seek near end: time ${(spotifyAfterSeek.msc as { currentTime?: number })?.currentTime}`,
    `- Final: \`${endTrack}\` @ index ${endIdx}, playing=${endPlaying}, time=${endTime}`,
    `- advanceQueueOnEnd calls after seek: ${advanceAfterSpotifySeek.length}`,
    `- play() calls after seek: ${playAfterSpotifySeek.length}`,
    "",
    "## Console chain after Spotify seek",
    "",
    ...spotifyConsoleAfterSeek.slice(0, 40).map(
      (e) => `- t+${e.tMs}ms **${e.kind}**`,
    ),
  ].join("\n");
  writeFileSync(OUT_MD, md);

  console.log(`Wrote ${OUT_MD}`);
  console.log(JSON.stringify(answers, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
