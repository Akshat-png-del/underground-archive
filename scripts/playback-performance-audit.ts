/**
 * Playback performance stabilization audit.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/playback-performance-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/playback-performance-audit.json");

type Counters = {
  snapshotCommits: number;
  mscReconcile: number;
  enginePublish: number;
  providerTick: number;
  storeMirror: number;
};

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(() => {
    localStorage.setItem("vf:sync-audit", "1");
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

  const counters: Counters = {
    snapshotCommits: 0,
    mscReconcile: 0,
    enginePublish: 0,
    providerTick: 0,
    storeMirror: 0,
  };
  const milestones: Array<{ tMs: number; kind: string }> = [];
  const t0 = Date.now();
  const rel = () => Date.now() - t0;

  page.on("console", (msg) => {
    const text = msg.text();
    const t = rel();
    if (text.includes("[SYNC-AUDIT]") && (text.includes("layer: 'snapshot'") || text.includes('"layer":"snapshot"')))
      counters.snapshotCommits += 1;
    if (text.includes('msc-reconcile')) counters.mscReconcile += 1;
    if (text.includes('engine-publish')) counters.enginePublish += 1;
    if (text.includes('provider-tick')) counters.providerTick += 1;
    if (text.includes("MediaSessionPersistence.pushLegacyMirror")) counters.storeMirror += 1;
    if (text.includes("[CLICK] playItem")) milestones.push({ tMs: t, kind: "click" });
    if (text.includes("[SESSION] play()")) milestones.push({ tMs: t, kind: "msc-play" });
    if (text.includes("[ENGINE] play requested")) milestones.push({ tMs: t, kind: "engine-play" });
    if (text.includes("ProviderRouter.play") && text.includes("enter"))
      milestones.push({ tMs: t, kind: "router-play" });
    if (text.includes("playback_confirmed")) milestones.push({ tMs: t, kind: "playback-confirmed" });
    if (text.includes("playback_update")) milestones.push({ tMs: t, kind: "sdk-update" });
  });

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const clickT = rel();
  await page.locator('[id^="track-"]').first().click();

  let firstSdk = 0;
  let firstEngineNonZero = 0;
  let firstSnapshotNonZero = 0;
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(100);
    const sample = await page.evaluate(() => {
      const w = window as Window & { __syncAuditSample?: () => Record<string, unknown> };
      const s = w.__syncAuditSample?.() ?? {};
      return {
        engine: (s.engine as { currentTime?: number })?.currentTime ?? 0,
        snapshot: (s.finalSnap as { displayTime?: number })?.displayTime ?? 0,
      };
    });
    if (!firstSdk && milestones.some((m) => m.kind === "sdk-update" && m.tMs > clickT))
      firstSdk = milestones.find((m) => m.kind === "sdk-update" && m.tMs > clickT)!.tMs - clickT;
    if (!firstEngineNonZero && sample.engine > 0.2) firstEngineNonZero = rel() - clickT;
    if (!firstSnapshotNonZero && sample.snapshot > 0.2) firstSnapshotNonZero = rel() - clickT;
  }

  const preCounters = { ...counters };
  await page.waitForTimeout(5000);
  const playbackCounters = {
    snapshotCommits: counters.snapshotCommits - preCounters.snapshotCommits,
    mscReconcile: counters.mscReconcile - preCounters.mscReconcile,
    enginePublish: counters.enginePublish - preCounters.enginePublish,
    providerTick: counters.providerTick - preCounters.providerTick,
    storeMirror: counters.storeMirror - preCounters.storeMirror,
  };

  const perf = await page.evaluate(() => {
    const w = window as Window & {
      __playbackPerf?: { snapshotCommits: number; snapshotSkipped: number };
    };
    return w.__playbackPerf ?? { snapshotCommits: 0, snapshotSkipped: 0 };
  });

  const report = {
    generated: new Date().toISOString(),
    startup: {
      clickToMscPlay: milestones.find((m) => m.kind === "msc-play")?.tMs ?? null,
      clickToEnginePlay: milestones.find((m) => m.kind === "engine-play")?.tMs ?? null,
      clickToRouterPlay: milestones.find((m) => m.kind === "router-play")?.tMs ?? null,
      clickToPlaybackConfirmed: milestones.find((m) => m.kind === "playback-confirmed")?.tMs ?? null,
      clickToFirstSdkUpdateMs: firstSdk || null,
      clickToFirstEngineNonZeroMs: firstEngineNonZero || null,
      clickToFirstSnapshotNonZeroMs: firstSnapshotNonZero || null,
      milestones,
    },
    playback5s: { ...playbackCounters, snapshotPerf: perf },
    ratios: {
      snapshotPerEnginePublish:
        playbackCounters.enginePublish > 0
          ? playbackCounters.snapshotCommits / playbackCounters.enginePublish
          : null,
      mscPerEnginePublish:
        playbackCounters.enginePublish > 0
          ? playbackCounters.mscReconcile / playbackCounters.enginePublish
          : null,
    },
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT);
  console.log("Startup ms:", {
    sdk: firstSdk,
    engine: firstEngineNonZero,
    snapshot: firstSnapshotNonZero,
  });
  console.log("5s playback counters:", playbackCounters);
  console.log("Ratios:", report.ratios);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
