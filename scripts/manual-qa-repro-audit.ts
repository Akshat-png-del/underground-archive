/**
 * Manual QA reproduction — seek lag, startup delay, volume/mute.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/manual-qa-repro-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/manual-qa-repro-audit.json");

type LayerSample = {
  tMs: number;
  engine?: number | null;
  msc?: number | null;
  snapshot?: number | null;
  uiSlider?: number | null;
  uiElapsed?: string | null;
  volume?: number | null;
  muted?: boolean | null;
  domAudioVolume?: number | null;
  domAudioMuted?: boolean | null;
  sliderPresent?: boolean;
  volumeSliderPresent?: boolean;
  volumeSliderValue?: number | null;
  muteDisabled?: boolean;
  isPlaying?: boolean | null;
  isLoading?: boolean | null;
  providerKind?: string | null;
};

async function sample(page: import("playwright").Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const w = window as Window & {
      __syncAuditSample?: (a?: string) => Record<string, unknown>;
      __volumeTraceSample?: (a?: string) => Record<string, unknown>;
    };
    const sync = w.__syncAuditSample?.("qa") ?? {};
    const vol = w.__volumeTraceSample?.("qa") ?? {};
    const seekSlider = document.querySelector(".sb-slider") as HTMLInputElement | null;
    const volSlider = document.querySelector(".player-volume-slider") as HTMLInputElement | null;
    const muteBtn = document.querySelector(".player-volume button") as HTMLButtonElement | null;
    const elapsed = document.querySelector(".sb-seek .sb-time")?.textContent?.trim() ?? null;
    const audio = document.querySelector("#vitalforge-playback-root audio") as HTMLAudioElement | null;
    const engine = sync.engine as { currentTime?: number; isPlaying?: boolean; isLoading?: boolean } | undefined;
    const msc = sync.msc as { currentTime?: number; volume?: number; muted?: boolean } | undefined;
    const snap = sync.finalSnap as { displayTime?: number; volume?: number; muted?: boolean } | undefined;
    const routerKind = (vol.routerKind as string) ?? null;
    return {
      engine: engine?.currentTime ?? null,
      msc: msc?.currentTime ?? null,
      snapshot: snap?.displayTime ?? null,
      uiSlider: seekSlider ? Number(seekSlider.value) : null,
      uiElapsed: elapsed,
      volume: snap?.volume ?? msc?.volume ?? null,
      muted: snap?.muted ?? msc?.muted ?? null,
      domAudioVolume: audio?.volume ?? null,
      domAudioMuted: audio?.muted ?? null,
      sliderPresent: !!seekSlider,
      volumeSliderPresent: !!volSlider,
      volumeSliderValue: volSlider ? Number(volSlider.value) : null,
      muteDisabled: muteBtn?.disabled ?? true,
      isPlaying: engine?.isPlaying ?? null,
      isLoading: engine?.isLoading ?? null,
      providerKind: routerKind,
    };
  });
}

function firstDivergence(samples: LayerSample[], field: keyof LayerSample, tol = 0.05): string | null {
  for (const s of samples) {
    const eng = s.engine;
    const msc = s.msc;
    const snap = s.snapshot;
    const ui = s.uiSlider;
    if (field === "seek") {
      if (eng != null && snap != null && Math.abs(eng - snap) > tol)
        return `engine=${eng} vs snapshot=${snap} at t+${s.tMs}ms`;
      if (snap != null && ui != null && Math.abs(snap - ui) > 0.99)
        return `snapshot=${snap} vs uiSlider=${ui} elapsed=${s.uiElapsed} at t+${s.tMs}ms`;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const t0 = Date.now();
  const rel = () => Date.now() - t0;

  await page.addInitScript(() => {
    localStorage.setItem("vf:sync-audit", "1");
    localStorage.setItem("vf:volume-trace", "1");
    localStorage.setItem("vf:seek-trace", "1");
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

  const milestones: Array<{ tMs: number; kind: string; detail?: string }> = [];
  page.on("console", (msg) => {
    const text = msg.text();
    const t = rel();
    if (text.includes("[CLICK] playItem")) milestones.push({ tMs: t, kind: "click" });
    if (text.includes("[ENGINE] play requested")) milestones.push({ tMs: t, kind: "engine-play" });
    if (text.includes("playback_update") && text.includes("position"))
      milestones.push({ tMs: t, kind: "playback-update", detail: text.slice(0, 120) });
    if (text.includes("commitSeek")) milestones.push({ tMs: t, kind: "commitSeek", detail: text.slice(0, 120) });
    if (text.includes("toggleMute")) milestones.push({ tMs: t, kind: "toggleMute", detail: text.slice(0, 120) });
    if (text.includes("setVolume") && text.includes("AudioProvider"))
      milestones.push({ tMs: t, kind: "audio-setVolume", detail: text.slice(0, 120) });
  });

  // ── ISSUE 2: Startup delay (Spotify) ─────────────────────────────────────
  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const clickStart = rel();
  milestones.push({ tMs: clickStart, kind: "play-click-start" });
  await page.locator('[id^="track-"]').first().click();
  milestones.push({ tMs: rel(), kind: "play-click-end" });

  const startupPolls: LayerSample[] = [];
  let firstAudible: number | null = null;
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(100);
    const raw = await sample(page);
    const poll: LayerSample = { tMs: rel(), ...raw };
    startupPolls.push(poll);
    if (poll.engine != null && poll.engine > 0.2 && firstAudible === null) firstAudible = poll.tMs;
  }

  await page.waitForSelector(".sb-slider", { timeout: 20000 });
  await page.waitForTimeout(2000);

  // ── ISSUE 1: Seek lag ────────────────────────────────────────────────────
  const preSeek = await sample(page);
  const box = await page.locator(".sb-slider").boundingBox();
  const seekSamples: LayerSample[] = [];
  const seekStart = rel();
  if (box) {
    const targetX = box.x + box.width * 0.6;
    const targetY = box.y + box.height / 2;
    await page.mouse.move(targetX, targetY);
    await page.mouse.down();
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(50);
      const s = await sample(page);
      seekSamples.push({ tMs: rel() - seekStart, ...s });
    }
    await page.mouse.up();
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      const s = await sample(page);
      seekSamples.push({ tMs: rel() - seekStart, ...s });
    }
  }

  // ── ISSUE 3: Volume on Spotify (user expectation) ──────────────────────────
  const spotifyVolumeBefore = await sample(page);
  await page.locator(".player-volume button").click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const spotifyVolumeAfterClick = await sample(page);
  if (await page.locator(".player-volume-slider").count()) {
    await page.locator(".player-volume-slider").fill("0.3");
    await page.waitForTimeout(300);
  }
  const spotifyVolumeAfterSlider = await sample(page);

  // ── ISSUE 3: Volume on preview ───────────────────────────────────────────
  await page.evaluate(() => {
    const w = window as Window & { __hydrationAudit?: { playPreview: () => void } };
    w.__hydrationAudit?.playPreview();
  });
  await page.waitForTimeout(3000);
  const previewBefore = await sample(page);
  await page.locator(".player-volume button").click();
  await page.waitForTimeout(300);
  const previewAfterMute = await sample(page);
  await page.locator(".player-volume-slider").fill("0.25");
  await page.waitForTimeout(300);
  const previewAfterVol = await sample(page);

  const report = {
    generated: new Date().toISOString(),
    issue2_startup: {
      milestones,
      firstEngineNonZeroMs: firstAudible,
      clickToEnginePlayMs:
        (milestones.find((m) => m.kind === "engine-play")?.tMs ?? 0) -
        (milestones.find((m) => m.kind === "play-click-end")?.tMs ?? 0),
      pollsAt1s: startupPolls.filter((p) => p.tMs >= 900 && p.tMs <= 1100),
      pollsAt3s: startupPolls.filter((p) => p.tMs >= 2900 && p.tMs <= 3100),
    },
    issue1_seek: {
      preSeek,
      samples: seekSamples,
      firstDivergence: firstDivergence(seekSamples, "seek"),
      sliderStep: await page.locator(".sb-slider").getAttribute("step"),
      maxSlider: await page.locator(".sb-slider").getAttribute("max"),
    },
    issue3_volume: {
      spotify: { before: spotifyVolumeBefore, afterMuteClick: spotifyVolumeAfterClick, afterSlider: spotifyVolumeAfterSlider },
      preview: { before: previewBefore, afterMute: previewAfterMute, afterVol: previewAfterVol },
    },
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT);
  console.log("Startup firstEngineNonZero:", firstAudible, "ms");
  console.log("Seek divergence:", report.issue1_seek.firstDivergence);
  console.log("Spotify volume slider:", spotifyVolumeBefore.volumeSliderPresent, "mute disabled:", spotifyVolumeBefore.muteDisabled);
  console.log("Preview after vol:", JSON.stringify(previewAfterVol));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
