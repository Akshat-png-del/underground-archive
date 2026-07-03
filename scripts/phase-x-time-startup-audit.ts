/**
 * Phase X — elapsed time + startup delay runtime audit (evidence only).
 *
 * Usage (dev server running):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/phase-x-time-startup-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ARTIST_URL = `${BASE_URL}/artists/sara-landry`;
const OUT_JSON = join(process.cwd(), "reports/phase-x-time-startup-audit.json");
const OUT_MD = join(process.cwd(), "reports/phase-x-time-startup-audit.md");

type LayerPoll = {
  tMs: number;
  provider: number | null;
  engine: number | null;
  msc: number | null;
  store: number | null;
  snapshot: number | null;
  uiElapsed: string | null;
  uiSlider: number | null;
  trackRowDuration: string | null;
  isPlaying: boolean | null;
  isLoading: boolean | null;
};

type Milestone = { tMs: number; kind: string; detail?: string };

async function pollAll(page: import("playwright").Page, activeTrackId: string | null): Promise<LayerPoll> {
  return page.evaluate((trackId) => {
    try {
      const w = window as Window & { __syncAuditSample?: (a?: string) => Record<string, unknown> };
      const sample = w.__syncAuditSample?.("poll") ?? {};
      const engine = sample.engine as { currentTime?: number; isPlaying?: boolean; isLoading?: boolean } | undefined;
      const msc = sample.msc as { currentTime?: number } | undefined;
      const store = sample.store as { currentTime?: number } | undefined;
      const finalSnap = sample.finalSnap as { displayTime?: number } | undefined;
      const ui = sample.ui as {
        sliderValue?: number | null;
        elapsedLabel?: string | null;
      } | undefined;

      let trackRowDuration: string | null = null;
      if (trackId) {
        const row = document.getElementById(`track-${trackId}`);
        const meta = row?.querySelector(".min-w-0.flex-1 p.text-xs.text-muted");
        trackRowDuration = meta?.textContent?.trim() ?? null;
      }

      return {
        tMs: 0,
        provider: engine?.currentTime ?? null,
        engine: engine?.currentTime ?? null,
        msc: msc?.currentTime ?? null,
        store: store?.currentTime ?? null,
        snapshot: finalSnap?.displayTime ?? null,
        uiElapsed: ui?.elapsedLabel ?? null,
        uiSlider: ui?.sliderValue ?? null,
        trackRowDuration,
        isPlaying: engine?.isPlaying ?? null,
        isLoading: engine?.isLoading ?? null,
      };
    } catch (e) {
      return {
        tMs: 0,
        provider: null,
        engine: null,
        msc: null,
        store: null,
        snapshot: null,
        uiElapsed: null,
        uiSlider: null,
        trackRowDuration: null,
        isPlaying: null,
        isLoading: null,
        error: String(e),
      } as LayerPoll & { error?: string };
    }
  }, activeTrackId);
}

async function sampleSync(page: import("playwright").Page, action: string) {
  return page.evaluate((act) => {
    const w = window as Window & { __syncAuditSample?: (a?: string) => Record<string, unknown> };
    return w.__syncAuditSample?.(act) ?? { error: "hook missing" };
  }, action);
}

function firstDivergentLayer(poll: LayerPoll): { layer: string; reason: string } | null {
  const tol = 0.05;
  const close = (a: number | null, b: number | null) =>
    a === null || b === null ? a === b : Math.abs(a - b) <= tol;

  const chain: Array<[string, number | null]> = [
    ["provider", poll.provider],
    ["engine", poll.engine],
    ["msc", poll.msc],
    ["store", poll.store],
    ["snapshot", poll.snapshot],
  ];

  for (let i = 1; i < chain.length; i++) {
    if (!close(chain[i - 1][1], chain[i][1])) {
      return {
        layer: chain[i][0],
        reason: `${chain[i - 1][0]}=${chain[i - 1][1]} vs ${chain[i][0]}=${chain[i][1]}`,
      };
    }
  }

  const uiFloor = poll.uiSlider;
  if (poll.snapshot !== null && uiFloor !== null && Math.abs(poll.snapshot - uiFloor) > 0.99) {
    return {
      layer: "ui",
      reason: `snapshot=${poll.snapshot} vs uiSlider(floor)=${uiFloor} elapsed=${poll.uiElapsed}`,
    };
  }
  return null;
}

async function runStartupScenario(
  page: import("playwright").Page,
  name: string,
  activeTrackId: string | null,
  click: () => Promise<void>,
  t0: number,
): Promise<{
  name: string;
  milestones: Milestone[];
  polls: LayerPoll[];
  settleSample: Record<string, unknown>;
}> {
  const milestones: Milestone[] = [];
  const mark = (kind: string, detail?: string) =>
    milestones.push({ tMs: Date.now() - t0, kind, detail });

  const seen = new Set<string>();
  const onConsole = (msg: import("playwright").ConsoleMessage) => {
    const text = msg.text();
    const rel = Date.now() - t0;
    const maybe = (kind: string, pred: boolean) => {
      if (pred && !seen.has(kind)) {
        seen.add(kind);
        mark(kind, text.slice(0, 240));
      }
    };
    maybe("click", text.includes("[CLICK]"));
    maybe("store-dispatch", text.includes("[STORE] play() action dispatched"));
    maybe("engine-play-requested", text.includes("[ENGINE] play requested"));
    maybe("provider-play", text.includes("[PROVIDER] play"));
    maybe("spotify-playback-update", text.includes("playback_update"));
    maybe("spotify-playback-started", text.includes("playback_started"));
    maybe("audio-play-event", text.includes("audio event: play"));
    maybe("sync-provider-tick", text.includes("[SYNC-AUDIT]") && text.includes('"layer":"provider"'));
    maybe("sync-snapshot-commit", text.includes("[SYNC-AUDIT]") && text.includes('"layer":"snapshot"'));
  };
  page.on("console", onConsole);

  mark("play-click-start");
  await click();
  mark("play-click-end");

  const polls: LayerPoll[] = [];
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(100);
    const raw = await pollAll(page, activeTrackId);
    const poll: LayerPoll = { ...raw, tMs: Date.now() - t0 };
    polls.push(poll);

    if (
      poll.engine !== null &&
      poll.engine > 0.2 &&
      !seen.has("first-engine-nonzero")
    ) {
      seen.add("first-engine-nonzero");
      mark("first-engine-nonzero", JSON.stringify(poll));
    }
    if (
      poll.snapshot !== null &&
      poll.snapshot > 0.2 &&
      !seen.has("first-snapshot-nonzero")
    ) {
      seen.add("first-snapshot-nonzero");
      mark("first-snapshot-nonzero", JSON.stringify(poll));
    }
    if (
      poll.uiElapsed &&
      poll.uiElapsed !== "0:00" &&
      !seen.has("first-ui-elapsed-nonzero")
    ) {
      seen.add("first-ui-elapsed-nonzero");
      mark("first-ui-elapsed-nonzero", JSON.stringify(poll));
    }
  }

  page.off("console", onConsole);

  const settleSample = await sampleSync(page, `${name}-settle`);
  return { name, milestones, polls, settleSample };
}

function latencyFromClick(milestones: Milestone[]): Record<string, number | null> {
  const click = milestones.find((m) => m.kind === "play-click-end")?.tMs ?? null;
  if (click === null) return {};
  const delta = (kind: string) => {
    const m = milestones.find((x) => x.kind === kind);
    return m ? m.tMs - click : null;
  };
  return {
    clickToProviderPlayMs: delta("provider-play"),
    clickToFirstPlaybackUpdateMs: delta("spotify-playback-update"),
    clickToFirstEngineNonZeroMs: delta("first-engine-nonzero"),
    clickToFirstSnapshotNonZeroMs: delta("first-snapshot-nonzero"),
    clickToFirstUiElapsedNonZeroMs: delta("first-ui-elapsed-nonzero"),
    clickToEnginePlayRequestedMs: delta("engine-play-requested"),
  };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const t0 = Date.now();

  await page.addInitScript(() => {
    localStorage.setItem("vf:sync-audit", "1");
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem("vf:msc-reconcile-trace", "1");
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

  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const firstTrackId =
    (await page.locator('[id^="track-"]').first().getAttribute("id"))?.replace(/^track-/, "") ?? null;

  const spotify = await runStartupScenario(
    page,
    "spotify-track",
    firstTrackId,
    async () => {
      await page.locator('[id^="track-"]').first().click();
    },
    t0,
  );

  // pause before refresh
  const pauseBtn = page.locator('[data-player-play-pause="true"].sb-pause');
  if ((await pauseBtn.count()) > 0) {
    await pauseBtn.click();
    await page.waitForTimeout(500);
  }

  const refreshSample = await sampleSync(page, "before-refresh-paused");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const afterRefresh = await sampleSync(page, "after-refresh");

  // preview audio scenario
  await page.goto(ARTIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const preview = await runStartupScenario(
    page,
    "preview-audio",
    "hydration-audit::preview",
    async () => {
      await page.evaluate(() => {
        const w = window as Window & {
          __hydrationAudit?: { playPreview: () => void };
        };
        w.__hydrationAudit?.playPreview();
      });
    },
    Date.now(),
  );

  await browser.close();

  const spotifyPollAt8s = spotify.polls.find((p) => p.tMs >= 7800 && p.tMs <= 8200) ?? spotify.polls.at(-1)!;
  const previewPollAt3s = preview.polls.find((p) => p.tMs >= 2800 && p.tMs <= 3200) ?? preview.polls.at(-1)!;

  const findings = {
    trackRow: {
      note: "TrackRow renders static catalog metadata (releaseYear · duration), not live elapsed.",
      spotifyActiveRowText: spotifyPollAt8s.trackRowDuration,
      spotifyEngineTimeAtSample: spotifyPollAt8s.engine,
      spotifySnapshotAtSample: spotifyPollAt8s.snapshot,
    },
    bottomPlayer: {
      spotifyAt8s: spotifyPollAt8s,
      previewAt3s: previewPollAt3s,
      spotifyFirstDivergence: firstDivergentLayer(spotifyPollAt8s),
      previewFirstDivergence: firstDivergentLayer(previewPollAt3s),
    },
    startupLatency: {
      spotify: latencyFromClick(spotify.milestones),
      preview: latencyFromClick(preview.milestones),
    },
    refresh: { before: refreshSample, after: afterRefresh },
  };

  const report = {
    generated: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenarios: { spotify, preview },
    findings,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [
    "# Phase X — Time Display + Startup Delay Audit",
    "",
    `Generated: ${report.generated}`,
    "",
    "## Track row elapsed (under active track)",
    "",
    `- Track row subline is **catalog static text**: \`${findings.trackRow.trackRowDuration ?? "n/a"}\``,
    `- Engine time at ~8s sample: **${findings.trackRow.spotifyEngineTimeAtSample}**`,
    `- Snapshot displayTime at ~8s: **${findings.trackRow.spotifySnapshotAtSample}**`,
    "",
    "## Bottom player elapsed @ settle samples",
    "",
    "### Spotify (~8s after click)",
    "",
    "```json",
    JSON.stringify(findings.bottomPlayer.spotifyAt8s, null, 2),
    "```",
    "",
    findings.bottomPlayer.spotifyFirstDivergence
      ? `**First divergent layer:** ${findings.bottomPlayer.spotifyFirstDivergence.layer} — ${findings.bottomPlayer.spotifyFirstDivergence.reason}`
      : "_All layers aligned within tolerance at sample._",
    "",
    "### Preview audio (~3s after click)",
    "",
    "```json",
    JSON.stringify(findings.bottomPlayer.previewAt3s, null, 2),
    "```",
    "",
    findings.bottomPlayer.previewFirstDivergence
      ? `**First divergent layer:** ${findings.bottomPlayer.previewFirstDivergence.layer} — ${findings.bottomPlayer.previewFirstDivergence.reason}`
      : "_All layers aligned within tolerance at sample._",
    "",
    "## Startup latency (ms from play click end)",
    "",
    "### Spotify",
    "",
    "```json",
    JSON.stringify(findings.startupLatency.spotify, null, 2),
    "```",
    "",
    "### Preview",
    "",
    "```json",
    JSON.stringify(findings.startupLatency.preview, null, 2),
    "```",
    "",
    "## Spotify milestones",
    "",
    ...spotify.milestones.map((m) => `- t+${m.tMs}ms **${m.kind}**${m.detail ? `: ${m.detail.slice(0, 120)}` : ""}`),
    "",
    "## Preview milestones",
    "",
    ...preview.milestones.map((m) => `- t+${m.tMs}ms **${m.kind}**${m.detail ? `: ${m.detail.slice(0, 120)}` : ""}`),
    "",
    "## Refresh (paused → reload)",
    "",
    "```json",
    JSON.stringify(findings.refresh, null, 2),
    "```",
  ];

  writeFileSync(OUT_MD, md.join("\n"));

  console.log(`Report: ${OUT_MD}`);
  console.log(`JSON: ${OUT_JSON}`);
  console.log("Spotify latency:", JSON.stringify(findings.startupLatency.spotify));
  console.log("Preview latency:", JSON.stringify(findings.startupLatency.preview));
  if (findings.bottomPlayer.spotifyFirstDivergence) {
    console.log("Spotify first divergent layer:", findings.bottomPlayer.spotifyFirstDivergence);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
