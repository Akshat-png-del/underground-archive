/**
 * Reproduce audio seek bug with timestamped multi-layer timeline.
 *
 * Usage (dev server must be running):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/seek-bug-repro.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_PATH = join(process.cwd(), "reports/seek-bug-repro.json");

interface TimelineEvent {
  tMs: number;
  phase: string;
  controllerCurrentTime: number;
  controllerPendingSeek: number | null;
  controllerIsSeeking: boolean;
  controllerSeekPreview: number | null;
  engineCurrentTime: number;
  engineDuration: number;
  storeCurrentTime: number;
  storeDuration: number;
  audioCurrentTime: number | null;
  sliderValue: number | null;
  sliderMax: number | null;
  elapsedLabel: string | null;
  displayTimeFromSnapshot: number | null;
  note?: string;
}

async function sampleState(page: import("playwright").Page, phase: string, t0: number, note?: string): Promise<TimelineEvent> {
  const data = await page.evaluate(() => {
    const w = window as Window & {
      __seekReproSample?: () => Record<string, unknown>;
    };
    const sample = w.__seekReproSample?.() ?? { error: "hook missing" };

    const seek =
      (document.querySelector(".sb-slider") as HTMLInputElement | null) ??
      (document.querySelector(".player-seek") as HTMLInputElement | null);
    const elapsedEl =
      document.querySelector(".sb-seek .sb-time") ??
      document.querySelector(".spotify-player-seek span.font-mono");

    return {
      sample,
      seekValue: seek ? Number(seek.value) : null,
      seekMax: seek ? Number(seek.max) : null,
      elapsedLabel: elapsedEl?.textContent ?? null,
    };
  });

  const s = data.sample as Record<string, unknown>;
  const controller = (s.controller as Record<string, unknown>) ?? {};
  const engine = (s.engine as Record<string, unknown>) ?? {};
  const store = (s.store as Record<string, unknown>) ?? {};
  const audio = (s.audio as Record<string, unknown> | null) ?? null;

  return {
    tMs: Date.now() - t0,
    phase,
    controllerCurrentTime: (controller.currentTime as number) ?? -1,
    controllerPendingSeek: (controller.seekPreviewTime as number | null) ?? null,
    controllerIsSeeking: !!(controller.isSeeking as boolean),
    controllerSeekPreview: (controller.seekPreviewTime as number | null) ?? null,
    engineCurrentTime: (engine.currentTime as number) ?? -1,
    engineDuration: (engine.duration as number) ?? -1,
    storeCurrentTime: (store.currentTime as number) ?? -1,
    storeDuration: (store.duration as number) ?? -1,
    audioCurrentTime: audio ? (audio.currentTime as number) : null,
    sliderValue: data.seekValue,
    sliderMax: data.seekMax,
    elapsedLabel: data.elapsedLabel,
    displayTimeFromSnapshot: (controller.displayTime as number | null) ?? null,
    note,
  };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const timeline: TimelineEvent[] = [];
  const consoleLogs: { tMs: number; text: string }[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (/\[(CLICK|SEEK|SESSION|ENGINE|STORE|PROVIDER|AUDIO)\]/.test(text)) {
      consoleLogs.push({ tMs: Date.now() - t0, text });
    }
  });

  await page.addInitScript(() => {
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

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const row = page.locator('[id^="track-"]').first();
  if ((await row.count()) === 0) {
    console.error("No track row found");
    process.exit(1);
  }

  timeline.push(await sampleState(page, "pre-play", t0));

  await row.click();
  await page.waitForTimeout(5000);

  timeline.push(await sampleState(page, "post-play-5s", t0));

  const preSeek = await sampleState(page, "pre-seek", t0);
  timeline.push(preSeek);

  const seek =
    (await page.locator(".sb-slider").count()) > 0
      ? page.locator(".sb-slider")
      : page.locator(".player-seek");

  if ((await seek.count()) === 0) {
    console.error("No seek bar found");
    process.exit(1);
  }

  const box = await seek.boundingBox();
  if (!box) {
    console.error("Seek bar has no bounding box");
    process.exit(1);
  }

  const targetRatio = 0.5;
  const clickX = box.x + box.width * targetRatio;
  const clickY = box.y + box.height / 2;

  // High-frequency sampling during seek settle window
  const sampleInterval = 16; // ~60fps
  const sampleDuration = 2000;
  let sampling = true;
  const sampleLoop = (async () => {
    while (sampling) {
      timeline.push(await sampleState(page, "during-settle", t0));
      await page.waitForTimeout(sampleInterval);
    }
  })();

  // Real user seek: pointerdown → drag to target → pointerup (commit path)
  await page.mouse.move(clickX, clickY);
  await page.mouse.down();
  timeline.push(await sampleState(page, "seek-pointerdown", t0, `pointerdown at ${(targetRatio * 100).toFixed(0)}%`));
  await page.waitForTimeout(50);
  await page.mouse.up();
  timeline.push(await sampleState(page, "seek-pointerup+0ms", t0, "pointerup commit"));

  await page.waitForTimeout(sampleDuration);
  sampling = false;
  await sampleLoop;

  timeline.push(await sampleState(page, "post-settle-2s", t0));

  // Detect first incorrect value relative to expected seek target
  const max = preSeek.sliderMax ?? preSeek.storeDuration ?? preSeek.engineDuration;
  const expectedSeekSeconds = max > 0 ? Math.floor(max * targetRatio) : null;

  interface Anomaly {
    tMs: number;
    field: string;
    value: unknown;
    expected: unknown;
    reason: string;
  }

  const anomalies: Anomaly[] = [];

  for (const ev of timeline) {
    if (expectedSeekSeconds === null) continue;

    // After seek commit (t > seek click), display should stay near target until playback advances
    if (ev.tMs < (timeline.find((e) => e.phase === "seek-pointerup+0ms")?.tMs ?? Infinity)) continue;

    const driftFromTarget = (v: number) => Math.abs(v - expectedSeekSeconds);

    // Within first 500ms after seek commit, anything >5s away from target is wrong (snap-back)
    if (ev.tMs < (timeline.find((e) => e.phase === "seek-pointerup+0ms")?.tMs ?? 0) + 500) {
      if (ev.controllerCurrentTime >= 0 && driftFromTarget(ev.controllerCurrentTime) > 5 && ev.controllerPendingSeek === null) {
        anomalies.push({
          tMs: ev.tMs,
          field: "controllerCurrentTime",
          value: ev.controllerCurrentTime,
          expected: expectedSeekSeconds,
          reason: "controller time snap-back after seek commit",
        });
      }
      if (ev.displayTimeFromSnapshot !== null && driftFromTarget(ev.displayTimeFromSnapshot) > 5) {
        anomalies.push({
          tMs: ev.tMs,
          field: "displayTimeFromSnapshot",
          value: ev.displayTimeFromSnapshot,
          expected: expectedSeekSeconds,
          reason: "UI display time snap-back after seek",
        });
      }
      if (ev.sliderValue !== null && driftFromTarget(ev.sliderValue) > 5) {
        anomalies.push({
          tMs: ev.tMs,
          field: "sliderValue",
          value: ev.sliderValue,
          expected: expectedSeekSeconds,
          reason: "seek slider snap-back",
        });
      }
    }

    // Engine/audio should eventually reach target (within 2s)
    if (ev.engineCurrentTime >= 0 && driftFromTarget(ev.engineCurrentTime) > max * 0.15 && ev.tMs > 1500) {
      anomalies.push({
        tMs: ev.tMs,
        field: "engineCurrentTime",
        value: ev.engineCurrentTime,
        expected: expectedSeekSeconds,
        reason: "engine never reached seek target",
      });
    }
  }

  const firstAnomaly = anomalies.sort((a, b) => a.tMs - b.tMs)[0] ?? null;

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    expectedSeekSeconds,
    preSeekPosition: preSeek.controllerCurrentTime,
    firstAnomaly,
    anomalyCount: anomalies.length,
    consoleLogs,
    timeline,
    anomalies,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Expected seek target: ${expectedSeekSeconds}s (max=${max})`);
  console.log(`Pre-seek position: ${preSeek.controllerCurrentTime}s`);
  console.log(`Timeline events: ${timeline.length}`);
  console.log(`Console pipeline logs: ${consoleLogs.length}`);
  if (firstAnomaly) {
    console.log(`FIRST INCORRECT VALUE: t+${firstAnomaly.tMs}ms ${firstAnomaly.field}=${firstAnomaly.value} (expected ~${firstAnomaly.expected}) — ${firstAnomaly.reason}`);
  } else {
    console.log("No snap-back anomalies detected in 2s settle window");
  }

  // Print compact timeline around seek click
  const clickT = timeline.find((e) => e.phase === "seek-pointerup+0ms")?.tMs ?? 0;
  console.log("\n--- TIMELINE (±500ms around seek click) ---");
  for (const ev of timeline.filter((e) => e.tMs >= clickT - 100 && e.tMs <= clickT + 500)) {
    console.log(
      `t+${String(ev.tMs).padStart(5)}ms | ctrl=${ev.controllerCurrentTime.toFixed(1)} eng=${ev.engineCurrentTime.toFixed(1)} store=${ev.storeCurrentTime.toFixed(1)} audio=${ev.audioCurrentTime?.toFixed(1) ?? "null"} slider=${ev.sliderValue} display=${ev.displayTimeFromSnapshot?.toFixed(1) ?? "null"} seeking=${ev.controllerIsSeeking}${ev.note ? ` (${ev.note})` : ""}`,
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
