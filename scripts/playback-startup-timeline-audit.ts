/**
 * Full playback startup timeline — click → UI update.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/playback-startup-timeline-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/playback-startup-timeline-audit.json");

type Stage =
  | "user_click"
  | "msc_play"
  | "engine_play"
  | "router_play_enter"
  | "provider_load"
  | "spotify_api_ready"
  | "embed_created"
  | "embed_ready_callback"
  | "play_command"
  | "playback_confirmed"
  | "first_playback_update"
  | "first_position_nonzero"
  | "engine_time_nonzero"
  | "snapshot_time_nonzero"
  | "ui_elapsed_nonzero"
  | "embed_ready_timeout"
  | "provider_ready_timeout"
  | "mount_layout_timeout"
  | "error";

interface Event {
  stage: Stage;
  tMs: number;
  elapsedFromClick: number | null;
  detail: string;
}

function classify(text: string): Stage | null {
  if (text.includes("[CLICK]") && text.includes("playItem")) return "user_click";
  if (text.includes("[SESSION] play()")) return "msc_play";
  if (text.includes("[ENGINE] play requested")) return "engine_play";
  if (text.includes("ProviderRouter.play") && text.includes("enter")) return "router_play_enter";
  if (text.includes("[PROVIDER] load") || text.includes("logProviderLoad")) return "provider_load";
  if (text.includes("Spotify IFrame API ready")) return "spotify_api_ready";
  if (text.includes("Spotify embed controller created")) return "embed_created";
  if (text.includes("embed iframe ready") || (text.includes("SDK_CALLBACK") && text.includes("ready")))
    return "embed_ready_callback";
  if (text.includes("startPlayback") || text.includes("[COMMAND EXECUTED]") && text.includes("play"))
    return "play_command";
  if (text.includes("playback_confirmed") || text.includes("[PLAYBACK CONFIRMED]"))
    return "playback_confirmed";
  if (text.includes("PLAYBACK_UPDATE") || text.includes("playback_update")) return "first_playback_update";
  if (text.includes("Spotify embed ready timeout")) return "embed_ready_timeout";
  if (text.includes("Provider ready timeout")) return "provider_ready_timeout";
  if (text.includes("mount layout not ready")) return "mount_layout_timeout";
  if (text.includes("[ENGINE]") && text.includes("error")) return "error";
  return null;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const t0 = Date.now();
  const events: Event[] = [];
  const seen = new Set<Stage>();
  let clickT: number | null = null;

  const push = (stage: Stage, detail: string) => {
    const tMs = Date.now() - t0;
    const elapsedFromClick = clickT !== null ? tMs - clickT : null;
    if (seen.has(stage) && stage !== "first_playback_update") return;
    seen.add(stage);
    events.push({ stage, tMs, elapsedFromClick, detail: detail.slice(0, 400) });
  };

  page.on("console", (msg) => {
    const text = msg.text();
    const stage = classify(text);
    if (stage) push(stage, text);
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem("vf:spotify-seek-audit", "1");
    localStorage.setItem("vf:hydration-trace", "1");
    localStorage.setItem("vf:sync-audit", "1");
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

  // Cold load
  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  clickT = Date.now() - t0;
  push("user_click", "playwright click");
  await page.locator('[id^="track-"]').first().click();

  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(100);
    const sample = await page.evaluate(() => {
      const w = window as Window & { __syncAuditSample?: () => Record<string, unknown> };
      const s = w.__syncAuditSample?.() ?? {};
      const engine = s.engine as { currentTime?: number } | undefined;
      const snap = s.finalSnap as { displayTime?: number } | undefined;
      const ui = s.ui as { elapsedLabel?: string } | undefined;
      return {
        engine: engine?.currentTime ?? 0,
        snapshot: snap?.displayTime ?? 0,
        uiElapsed: ui?.elapsedLabel ?? null,
      };
    });
    if (!seen.has("engine_time_nonzero") && sample.engine > 0.2) {
      push("engine_time_nonzero", `engine=${sample.engine}`);
    }
    if (!seen.has("snapshot_time_nonzero") && sample.snapshot > 0.2) {
      push("snapshot_time_nonzero", `snapshot=${sample.snapshot}`);
    }
    if (
      !seen.has("ui_elapsed_nonzero") &&
      sample.uiElapsed &&
      sample.uiElapsed !== "0:00"
    ) {
      push("ui_elapsed_nonzero", `ui=${sample.uiElapsed}`);
    }
  }

  // Refresh while playing scenario
  const refreshEvents: Event[] = [];
  const refreshSeen = new Set<string>();
  let refreshT: number | null = null;

  const onRefreshConsole = (msg: import("playwright").ConsoleMessage) => {
    const text = msg.text();
    const tMs = Date.now() - t0;
    const key = text.slice(0, 80);
    if (refreshSeen.has(key)) return;
    if (
      text.includes("[HYDRATION-TRACE]") ||
      text.includes("restorePersistedSession") ||
      text.includes("hydratePausedSession") ||
      text.includes("embed ready timeout") ||
      text.includes("Provider ready timeout") ||
      text.includes("playback_confirmed") ||
      text.includes("[ENGINE] play requested")
    ) {
      refreshSeen.add(key);
      refreshEvents.push({
        stage: "msc_play",
        tMs,
        elapsedFromClick: refreshT !== null ? tMs - refreshT : null,
        detail: text.slice(0, 400),
      });
    }
  };

  page.on("console", onRefreshConsole);
  refreshT = Date.now() - t0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(12000);
  page.off("console", onRefreshConsole);

  const refreshSample = await page.evaluate(() => {
    const w = window as Window & {
      __hydrationTraceSample?: () => Record<string, unknown>;
      __syncAuditSample?: () => Record<string, unknown>;
    };
    return {
      hydration: w.__hydrationTraceSample?.("refresh-settle") ?? {},
      sync: w.__syncAuditSample?.("refresh-settle") ?? {},
    };
  });

  const report = {
    generated: new Date().toISOString(),
    coldStart: { events, clickT },
    refresh: { events: refreshEvents, refreshT, sample: refreshSample },
    gaps: computeGaps(events),
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT);
  console.log("Timeline:", events.map((e) => `${e.stage}@${e.elapsedFromClick ?? e.tMs}ms`).join(" → "));
  if (events.some((e) => e.stage.includes("timeout"))) {
    console.log("TIMEOUT DETECTED");
  }
  await browser.close();
}

function computeGaps(events: Event[]): Array<{ from: Stage; to: Stage; ms: number }> {
  const order: Stage[] = [
    "user_click",
    "msc_play",
    "engine_play",
    "router_play_enter",
    "provider_load",
    "spotify_api_ready",
    "embed_created",
    "embed_ready_callback",
    "play_command",
    "playback_confirmed",
    "first_playback_update",
    "engine_time_nonzero",
    "snapshot_time_nonzero",
    "ui_elapsed_nonzero",
  ];
  const byStage = new Map(events.map((e) => [e.stage, e]));
  const gaps: Array<{ from: Stage; to: Stage; ms: number }> = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = byStage.get(order[i]);
    const b = byStage.get(order[i + 1]);
    if (a && b) gaps.push({ from: order[i], to: order[i + 1], ms: b.tMs - a.tMs });
  }
  return gaps;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
