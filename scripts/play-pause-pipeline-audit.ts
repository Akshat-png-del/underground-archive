/**
 * Play/pause pipeline runtime audit — evidence capture only.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/play-pause-pipeline-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_JSON = join(process.cwd(), "reports/play-pause-pipeline-audit.json");
const OUT_MD = join(process.cwd(), "reports/play-pause-pipeline-audit.md");

interface TraceEntry {
  tMs: number;
  fn: string;
  phase: string;
  detail: Record<string, unknown>;
}

interface LayerSample {
  label: string;
  tMs: number;
  msc?: boolean;
  engine?: boolean;
  store?: boolean;
  snapshot?: boolean;
  uiPlay?: boolean | null;
  uiPause?: boolean | null;
  divergence: string | null;
}

function layerMismatch(sample: Record<string, unknown>): string | null {
  const msc = (sample.msc as { isPlaying?: boolean })?.isPlaying;
  const engine = (sample.engine as { isPlaying?: boolean })?.isPlaying;
  const store = (sample.store as { isPlaying?: boolean })?.isPlaying;
  const snap = (sample.snapshot as { isPlaying?: boolean })?.isPlaying;
  const ui = sample.ui as { playVisible?: boolean | null; pauseVisible?: boolean | null } | undefined;
  const layers = [
    ["msc", msc],
    ["engine", engine],
    ["store", store],
    ["snapshot", snap],
  ] as const;
  const playing = layers.map(([, v]) => v).filter((v) => v !== undefined);
  if (new Set(playing).size > 1) {
    return layers.map(([k, v]) => `${k}=${v}`).join(" | ");
  }
  if (ui && msc !== undefined) {
    const uiSaysPlaying = ui.pauseVisible === true && ui.playVisible === false;
    const uiSaysPaused = ui.playVisible === true && ui.pauseVisible === false;
    if (msc && !uiSaysPlaying) return `UI not showing pause while msc.isPlaying=true`;
    if (!msc && !uiSaysPaused) return `UI not showing play while msc.isPlaying=false`;
  }
  return null;
}

async function sample(page: import("playwright").Page, label: string): Promise<Record<string, unknown>> {
  return page.evaluate((l) => {
    const w = window as Window & { __playPauseTraceSample?: (label?: string) => Record<string, unknown> };
    return w.__playPauseTraceSample?.(l) ?? { error: "hook missing" };
  }, label);
}

function analyze(entries: TraceEntry[], samples: LayerSample[]) {
  const playPauseEvents = entries.filter((e) =>
    ["ENTER", "EXIT", "transport_patch", "store_mirror", "snapshot_commit", "playback_update", "reconcile"].includes(
      e.phase,
    ),
  );

  const duplicates = entries.filter((e) => e.detail.duplicateCommand === true);
  const stalePlaybackUpdates = entries.filter(
    (e) =>
      e.fn === "SpotifyProvider.onUpdate" &&
      e.phase === "playback_update" &&
      e.detail.providerIsPlaying === true &&
      entries.some(
        (p) =>
          p.tMs < e.tMs &&
          p.tMs > e.tMs - 2000 &&
          p.fn === "MediaSessionController.pause" &&
          p.phase === "ENTER",
      ),
  );

  let firstIncorrect: TraceEntry | null = null;
  let firstIncorrectLayer: string | null = null;

  for (const s of samples) {
    if (s.divergence) {
      firstIncorrect = {
        tMs: s.tMs,
        fn: "__playPauseTraceSample",
        phase: s.label,
        detail: { divergence: s.divergence },
      };
      if (s.divergence.includes("engine")) firstIncorrectLayer = "engine";
      else if (s.divergence.includes("store")) firstIncorrectLayer = "store";
      else if (s.divergence.includes("snapshot")) firstIncorrectLayer = "snapshot";
      else if (s.divergence.includes("UI")) firstIncorrectLayer = "UI";
      else firstIncorrectLayer = "msc";
      break;
    }
  }

  // MSC true before provider during pause/resume transitions
  const mscBeforeProvider: TraceEntry[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (e.fn === "MediaSessionController.patchTransport" && e.detail.mscIsPlaying === true) {
      const nextProvider = entries.slice(i + 1, i + 8).find((x) => x.detail.providerIsPlaying !== undefined);
      if (nextProvider && nextProvider.detail.providerIsPlaying === false) {
        mscBeforeProvider.push(e);
      }
    }
  }

  const pauseLagProvider = entries.filter(
    (e) =>
      e.fn === "MediaSessionController.pause" &&
      e.phase === "EXIT" &&
      e.detail.mscIsPlaying === false &&
      e.detail.engineIsPlaying === true,
  );

  const snapshotLag = samples.filter((s, i) => {
    if (i === 0) return false;
    const prev = samples[i - 1];
    return prev.msc !== undefined && s.snapshot !== undefined && prev.msc !== s.snapshot && s.msc === s.snapshot;
  });

  const persistentDesync = samples.filter((s) => s.divergence !== null);

  return {
    totalTraceEntries: entries.length,
    playPauseEvents: playPauseEvents.length,
    duplicateCommands: duplicates.length,
    duplicateCommandDetails: duplicates.map((d) => ({ tMs: d.tMs, fn: d.fn, phase: d.phase })),
    stalePlaybackUpdatesAfterPause: stalePlaybackUpdates.length,
    stalePlaybackUpdateDetails: stalePlaybackUpdates.map((d) => ({
      tMs: d.tMs,
      providerIsPlaying: d.detail.providerIsPlaying,
    })),
    mscTrueBeforeProviderCount: mscBeforeProvider.length,
    mscTrueBeforeProviderDetails: mscBeforeProvider.slice(0, 5).map((d) => ({ tMs: d.tMs, fn: d.fn })),
    pauseLagProviderCount: pauseLagProvider.length,
    pauseLagProviderDetails: pauseLagProvider.map((d) => ({ tMs: d.tMs, engineIsPlaying: d.detail.engineIsPlaying })),
    snapshotLagSamples: snapshotLag.length,
    persistentDesyncCount: persistentDesync.length,
    firstIncorrect,
    firstIncorrectLayer,
    answers: {
      q1_firstIncorrectValue: firstIncorrect?.detail.divergence ?? firstIncorrect?.detail ?? null,
      q2_firstIncorrectLayer: firstIncorrectLayer,
      q3_playBeforeProvider: mscBeforeProvider.length > 0,
      q4_pauseLagsProvider: pauseLagProvider.length > 0,
      q5_snapshotLagsController: snapshotLag.length > 0,
      q6_uiLagsSnapshot: samples.some((s) => s.divergence?.includes("UI")),
      q7_duplicatePlay: duplicates.filter((d) => String(d.detail.event).includes("resume") || d.fn.includes("play")).length,
      q8_duplicatePause: duplicates.filter((d) => String(d.detail.event) === "pause").length,
      q9_playbackUpdateOverwritesTransport: stalePlaybackUpdates.length > 0,
      q10_rapidToggleRace: null as boolean | null,
      q11_stalePlaybackUpdateAfterPause: stalePlaybackUpdates.length > 0,
      q12_persistentDesync: persistentDesync.length > 0,
    },
  };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const entries: TraceEntry[] = [];
  const samples: LayerSample[] = [];
  const t0 = Date.now();

  page.on("console", async (msg) => {
    const text = msg.text();
    if (!text.includes("[PLAY-PAUSE-TRACE]")) return;
    const match = text.match(/\[PLAY-PAUSE-TRACE\] (\S+) (\S+)/);
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

  await page.addInitScript(() => {
    localStorage.setItem("vf:play-pause-trace", "1");
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

  // Initial play
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(6000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });

  const pushSample = async (label: string) => {
    const data = await sample(page, label);
    const div = layerMismatch(data);
    const msc = data.msc as { isPlaying?: boolean } | undefined;
    const engine = data.engine as { isPlaying?: boolean } | undefined;
    const store = data.store as { isPlaying?: boolean } | undefined;
    const snap = data.snapshot as { isPlaying?: boolean } | undefined;
    const ui = data.ui as { playVisible?: boolean | null; pauseVisible?: boolean | null } | undefined;
    samples.push({
      label,
      tMs: Date.now() - t0,
      msc: msc?.isPlaying,
      engine: engine?.isPlaying,
      store: store?.isPlaying,
      snapshot: snap?.isPlaying,
      uiPlay: ui?.playVisible ?? null,
      uiPause: ui?.pauseVisible ?? null,
      divergence: div,
    });
    await page.waitForTimeout(150);
  };

  await pushSample("after-initial-play");

  // Pause via UI
  await page.locator(".sb-pause").click();
  await page.waitForTimeout(2000);
  await pushSample("after-ui-pause");

  // Resume via UI
  await page.locator(".sb-play").click();
  await page.waitForTimeout(3000);
  await pushSample("after-ui-resume");

  // Pause via MSC audit hook
  await page.evaluate(() => {
    const w = window as Window & { __playPauseAudit?: { pause: () => void } };
    w.__playPauseAudit?.pause();
  });
  await page.waitForTimeout(2000);
  await pushSample("after-msc-pause");

  // Resume via MSC
  await page.evaluate(() => {
    const w = window as Window & { __playPauseAudit?: { resume: () => void } };
    w.__playPauseAudit?.resume();
  });
  await page.waitForTimeout(3000);
  await pushSample("after-msc-resume");

  // Rapid toggle
  await page.evaluate(async () => {
    const w = window as Window & {
      __playPauseAudit?: { rapidToggle: (n: number, ms: number) => Promise<void> };
    };
    await w.__playPauseAudit?.rapidToggle(6, 120);
  });
  await page.waitForTimeout(2500);
  await pushSample("after-rapid-toggle");

  const analysis = analyze(entries, samples);
  analysis.answers.q10_rapidToggleRace =
    samples.find((s) => s.label === "after-rapid-toggle")?.divergence !== null ||
    entries.filter((e) => e.tMs > samples.find((s) => s.label === "after-msc-resume")!.tMs).some((e) => e.detail.duplicateCommand);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    timeline: entries,
    samples,
    analysis,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = `# Play/Pause Pipeline Audit

Generated: ${report.generatedAt}

## Answers

| # | Question | Result |
|---|----------|--------|
| 1 | First incorrect value | ${JSON.stringify(analysis.answers.q1_firstIncorrectValue)} |
| 2 | First incorrect layer | ${analysis.answers.q2_firstIncorrectLayer ?? "none observed"} |
| 3 | Play true before provider? | ${analysis.answers.q3_playBeforeProvider} (${analysis.mscTrueBeforeProviderCount} events) |
| 4 | Pause lags provider? | ${analysis.answers.q4_pauseLagsProvider} (${analysis.pauseLagProviderCount} events) |
| 5 | Snapshot lags controller? | ${analysis.answers.q5_snapshotLagsController} |
| 6 | UI lags snapshot? | ${analysis.answers.q6_uiLagsSnapshot} |
| 7 | Duplicate play commands? | ${analysis.answers.q7_duplicatePlay} |
| 8 | Duplicate pause commands? | ${analysis.answers.q8_duplicatePause} |
| 9 | playback_update overwrites transport? | ${analysis.answers.q9_playbackUpdateOverwritesTransport} |
| 10 | Rapid play/pause race? | ${analysis.answers.q10_rapidToggleRace} |
| 11 | Stale playback_update after pause? | ${analysis.answers.q11_stalePlaybackUpdateAfterPause} |
| 12 | Persistent desync? | ${analysis.answers.q12_persistentDesync} |

## Samples

${samples.map((s) => `- **${s.label}** @ ${s.tMs}ms: msc=${s.msc} engine=${s.engine} store=${s.store} snapshot=${s.snapshot} uiPlay=${s.uiPlay} uiPause=${s.uiPause}${s.divergence ? ` **DIVERGED: ${s.divergence}**` : ""}`).join("\n")}

## First 40 timeline events

${entries
  .slice(0, 40)
  .map(
    (e) =>
      `- ${e.tMs}ms \`${e.fn} ${e.phase}\` msc=${e.detail.mscIsPlaying ?? "-"} engine=${e.detail.engineIsPlaying ?? "-"} provider=${e.detail.providerIsPlaying ?? "-"} snap=${e.detail.snapshotIsPlaying ?? "-"}`,
  )
  .join("\n")}
`;

  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(JSON.stringify(analysis.answers, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
