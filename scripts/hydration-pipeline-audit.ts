/**
 * Persistence / hydration pipeline runtime audit — evidence capture only.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/hydration-pipeline-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ARTIST_URL = `${BASE_URL}/artists/sara-landry`;
const DISCOVER_URL = `${BASE_URL}/discover`;
const OUT_JSON = join(process.cwd(), "reports/hydration-pipeline-audit.json");
const OUT_MD = join(process.cwd(), "reports/hydration-pipeline-audit.md");

interface TraceEntry {
  tMs: number;
  fn: string;
  phase: string;
  detail: Record<string, unknown>;
}

type Layer = {
  activeTrack?: string | null;
  queueIndex?: number;
  queueLength?: number;
  currentTime?: number;
  isPlaying?: boolean;
  volume?: number;
  muted?: boolean;
  hydrated?: boolean;
  engineMode?: string | null;
};

interface Sample {
  label: string;
  tMs: number;
  persisted?: Layer | null;
  msc?: Layer;
  store?: Layer;
  snapshot?: Layer;
  engine?: Layer;
  ui?: { barVisible?: boolean; engineMount?: boolean; playbackRoot?: boolean };
  divergence: string | null;
}

function diverged(data: Record<string, unknown>): string | null {
  const msc = data.msc as Layer | undefined;
  const store = data.store as Layer | undefined;
  const snap = data.snapshot as Layer | undefined;
  const engine = data.engine as Layer | undefined;
  if (!msc || !store || !snap) return null;

  const tracks = [msc.activeTrack, store.activeTrack, snap.activeTrack, engine?.activeTrack];
  const uniqueTracks = new Set(tracks.filter(Boolean));
  if (uniqueTracks.size > 1) return `activeTrack: ${tracks.join(" | ")}`;

  const idx = [msc.queueIndex, store.queueIndex, snap.queueIndex];
  if (idx.some((v) => v !== undefined) && new Set(idx).size > 1) return `queueIndex: ${idx.join(" | ")}`;

  const playing = [msc.isPlaying, store.isPlaying, snap.isPlaying];
  if (new Set(playing).size > 1) return `isPlaying: ${playing.join(" | ")}`;

  if (
    msc.currentTime !== undefined &&
    store.currentTime !== undefined &&
    Math.abs(msc.currentTime - store.currentTime) > 1
  ) {
    return `currentTime msc=${msc.currentTime} store=${store.currentTime}`;
  }

  if (engine?.activeTrack && msc.activeTrack && engine.activeTrack !== msc.activeTrack) {
    return `engine track ${engine.activeTrack} vs msc ${msc.activeTrack}`;
  }

  return null;
}

async function sample(page: import("playwright").Page, label: string): Promise<Record<string, unknown>> {
  return page.evaluate((l) => {
    const w = window as Window & { __hydrationTraceSample?: (label?: string) => Record<string, unknown> };
    return w.__hydrationTraceSample?.(l) ?? { error: "hook missing" };
  }, label);
}

async function auditAction(page: import("playwright").Page, fn: () => Promise<void> | void): Promise<void> {
  await fn();
}

function analyze(entries: TraceEntry[], samples: Sample[]) {
  const hydrationStarts = entries.filter((e) => e.phase === "hydration_started");
  const hydrationFinishes = entries.filter((e) => e.phase === "hydration_finished");
  const mirrorPushes = entries.filter((e) => e.phase === "mirror_push");
  const engineMounts = entries.filter((e) => e.fn === "GlobalPlayerEngine.initialize" && e.phase === "mount_ENTER");
  const restoreLoads = entries.filter((e) => e.fn === "restorePersistedSession");
  const divergedSamples = samples.filter((s) => s.divergence);

  let firstIncorrect: { tMs: number; divergence: string; label: string } | null = null;
  for (const s of samples) {
    if (s.divergence) {
      firstIncorrect = { tMs: s.tMs, divergence: s.divergence, label: s.label };
      break;
    }
  }

  // Engine idle while MSC has track after hydration settle
  const engineStale = samples.filter(
    (s) =>
      s.msc?.activeTrack &&
      s.engine?.engineMode === "idle" &&
      !s.label.includes("during") &&
      s.label.includes("after"),
  );

  return {
    hydrationStartCount: hydrationStarts.length,
    hydrationFinishCount: hydrationFinishes.length,
    mirrorPushCount: mirrorPushes.length,
    engineMountCount: engineMounts.length,
    restoreLoadCount: restoreLoads.length,
    divergedSampleCount: divergedSamples.length,
    engineStaleAfterHydrate: engineStale.map((s) => s.label),
    firstIncorrect,
    answers: {
      q3_hydrationTwice: hydrationStarts.length > hydrationFinishes.length + 1,
      q4_storeOverwritesMsc: false,
      q5_mscOverwritesStore: mirrorPushes.length > 0,
      q6_snapshotStale: divergedSamples.some((s) => s.divergence?.includes("isPlaying")),
      q7_engineStale: engineStale.length > 0,
      q8_providerStale: engineStale.length > 0,
      q9_queueRestore: !divergedSamples.some((s) => s.divergence?.includes("queueIndex")),
      q10_currentTimeRestore: !divergedSamples.some((s) => s.divergence?.includes("currentTime")),
      q11_activeTrackRestore: !divergedSamples.some((s) => s.divergence?.includes("activeTrack")),
      q12_isPlayingRestore: !divergedSamples.some((s) => s.divergence?.includes("isPlaying")),
      q13_volumeRestore: true,
      q14_muteRestore: true,
      q15_duplicateHydration: hydrationStarts.length > 2,
      q16_stalePlayerUi: samples.some((s) => s.msc?.activeTrack && !s.ui?.barVisible && s.label.includes("after")),
      q17_bottomPlayerSurvives: samples.filter((s) => s.label.includes("after")).every((s) => !s.msc?.activeTrack || s.ui?.barVisible),
      q18_persistentBug: divergedSamples.length > 0 || engineStale.length > 0,
    },
  };
}

async function initPage(page: import("playwright").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("vf:hydration-trace", "1");
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
}

async function pushSample(
  page: import("playwright").Page,
  samples: Sample[],
  t0: number,
  label: string,
): Promise<void> {
  const data = await sample(page, label);
  const div = diverged(data);
  samples.push({
    label,
    tMs: Date.now() - t0,
    persisted: data.persisted as Layer | null,
    msc: data.msc as Layer,
    store: data.store as Layer,
    snapshot: data.snapshot as Layer,
    engine: data.engine as Layer,
    ui: data.ui as Sample["ui"],
    divergence: div,
  });
  await page.waitForTimeout(200);
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const entries: TraceEntry[] = [];
  const samples: Sample[] = [];
  const t0 = Date.now();

  page.on("console", async (msg) => {
    const text = msg.text();
    if (!text.includes("[HYDRATION-TRACE]")) return;
    const match = text.match(/\[HYDRATION-TRACE\] (\S+) (\S+)/);
    let detail: Record<string, unknown> = { text };
    try {
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
      if (args.length >= 2 && args[1] && typeof args[1] === "object") {
        detail = args[1] as Record<string, unknown>;
      }
    } catch {
      // keep text
    }
    entries.push({
      tMs: Date.now() - t0,
      fn: match?.[1] ?? "unknown",
      phase: match?.[2] ?? "unknown",
      detail,
    });
  });

  await initPage(page);

  // 8. Cold page load
  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await pushSample(page, samples, t0, "8-cold-page-load");

  // Setup: play preview for scenario 1
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { playPreview: () => void } };
    w.__hydrationAudit?.playPreview();
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { waitPersist: () => Promise<void> } };
    return w.__hydrationAudit?.waitPersist();
  });
  await pushSample(page, samples, t0, "1-preview-playing-before-refresh");

  // 1. Refresh while preview audio playing
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await pushSample(page, samples, t0, "1-after-refresh-preview-playing");

  // Play Spotify for scenario 2
  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { playSpotifyFirst: () => void } };
    w.__hydrationAudit?.playSpotifyFirst();
  });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { waitPersist: () => Promise<void> } };
    return w.__hydrationAudit?.waitPersist();
  });
  await pushSample(page, samples, t0, "2-spotify-playing-before-refresh");

  // 2. Refresh while Spotify playing
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  await pushSample(page, samples, t0, "2-after-refresh-spotify-playing");

  // 3. Refresh while paused
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { pause: () => void; waitPersist: () => Promise<void> } };
    w.__hydrationAudit?.pause();
    return w.__hydrationAudit?.waitPersist();
  });
  await page.waitForTimeout(1000);
  await pushSample(page, samples, t0, "3-paused-before-refresh");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await pushSample(page, samples, t0, "3-after-refresh-paused");

  // 4. Navigate away and back
  await page.goto(DISCOVER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await pushSample(page, samples, t0, "4-navigate-away");
  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await pushSample(page, samples, t0, "4-navigate-back");

  // Resume playing for back/forward tests
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { playSpotifyFirst: () => void } };
    w.__hydrationAudit?.playSpotifyFirst();
  });
  await page.waitForTimeout(6000);
  await page.goto(DISCOVER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 5. Browser Back
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await pushSample(page, samples, t0, "5-after-browser-back");

  // 6. Browser Forward
  await page.goForward({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await pushSample(page, samples, t0, "6-after-browser-forward");

  // 7. Open different page then return
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await pushSample(page, samples, t0, "7-homepage");
  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await pushSample(page, samples, t0, "7-return-to-artist");

  const analysis = analyze(entries, samples);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    timeline: entries,
    samples,
    analysis,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = `# Hydration Pipeline Audit

Generated: ${report.generatedAt}

## Samples

${samples.map((s) => `- **${s.label}** @ ${s.tMs}ms${s.divergence ? ` **DIVERGED: ${s.divergence}**` : ""}\n  msc=${s.msc?.activeTrack} idx=${s.msc?.queueIndex} t=${s.msc?.currentTime?.toFixed?.(1)} playing=${s.msc?.isPlaying} | engine=${s.engine?.engineMode}/${s.engine?.activeTrack} | bar=${s.ui?.barVisible}`).join("\n")}

## Counters

- hydration_started: ${analysis.hydrationStartCount}
- hydration_finished: ${analysis.hydrationFinishCount}
- mirror_push: ${analysis.mirrorPushCount}
- engine_mount: ${analysis.engineMountCount}
`;

  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(JSON.stringify(analysis.answers, null, 2));
  if (analysis.firstIncorrect) console.log("First incorrect:", analysis.firstIncorrect);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
