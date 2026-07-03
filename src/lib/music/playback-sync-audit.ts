/**
 * Playback state synchronization audit — logging only.
 * Enable: localStorage.setItem('vf:sync-audit', '1')
 */

export type SyncAuditLayer =
  | "provider"
  | "engine"
  | "msc"
  | "store"
  | "snapshot"
  | "ui";

export type SyncAuditSample = {
  ts: number;
  action: string;
  layer: SyncAuditLayer;
  currentTime: number | null;
  duration: number | null;
  isPlaying: boolean | null;
  volume: number | null;
  muted: boolean | null;
  isLoading: boolean | null;
  currentTrack: string | null;
  extra?: Record<string, unknown>;
};

export type SyncAuditDivergence = {
  ts: number;
  action: string;
  field: string;
  provider: unknown;
  engine: unknown;
  msc: unknown;
  store: unknown;
  snapshot: unknown;
  ui: unknown;
  firstDivergentLayer: SyncAuditLayer;
};

const STORAGE_KEY = "vf:sync-audit";
let seq = 0;
const frameBuffer: Partial<Record<SyncAuditLayer, SyncAuditSample>> = {};
let lastAction = "idle";

export function isSyncAuditEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

export function syncAuditSetAction(action: string): void {
  lastAction = action;
}

export function syncAuditRecord(sample: SyncAuditSample): void {
  if (!isSyncAuditEnabled()) return;
  frameBuffer[sample.layer] = sample;
  seq += 1;
  console.log("[SYNC-AUDIT]", {
    id: seq,
    action: sample.action || lastAction,
    layer: sample.layer,
    currentTime: sample.currentTime,
    duration: sample.duration,
    isPlaying: sample.isPlaying,
    volume: sample.volume,
    muted: sample.muted,
    isLoading: sample.isLoading,
    currentTrack: sample.currentTrack,
    ...sample.extra,
  });
}

function numClose(a: number | null, b: number | null, tol = 0.05): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tol;
}

function boolEq(a: boolean | null, b: boolean | null): boolean {
  return a === b;
}

function strEq(a: string | null, b: string | null): boolean {
  return a === b;
}

export function syncAuditCompareFrame(action: string): SyncAuditDivergence | null {
  if (!isSyncAuditEnabled()) return null;
  const p = frameBuffer.provider;
  const e = frameBuffer.engine;
  const m = frameBuffer.msc;
  const s = frameBuffer.store;
  const snap = frameBuffer.snapshot;
  const ui = frameBuffer.ui;
  if (!p || !e || !m || !snap) return null;

  const fields: Array<{
    name: string;
    layers: Partial<Record<SyncAuditLayer, unknown>>;
    compare: (a: unknown, b: unknown) => boolean;
  }> = [
    {
      name: "currentTime",
      layers: {
        provider: p.currentTime,
        engine: e.currentTime,
        msc: m.currentTime,
        store: s?.currentTime ?? null,
        snapshot: snap.currentTime,
        ui: ui?.currentTime ?? null,
      },
      compare: (a, b) => numClose(a as number | null, b as number | null),
    },
    {
      name: "duration",
      layers: {
        provider: p.duration,
        engine: e.duration,
        msc: m.duration,
        store: s?.duration ?? null,
        snapshot: snap.duration,
        ui: ui?.duration ?? null,
      },
      compare: (a, b) => numClose(a as number | null, b as number | null, 0.1),
    },
    {
      name: "isPlaying",
      layers: {
        provider: p.isPlaying,
        engine: e.isPlaying,
        msc: m.isPlaying,
        store: s?.isPlaying ?? null,
        snapshot: snap.isPlaying,
        ui: ui?.isPlaying ?? null,
      },
      compare: (a, b) => boolEq(a as boolean | null, b as boolean | null),
    },
    {
      name: "currentTrack",
      layers: {
        provider: p.currentTrack,
        engine: e.currentTrack,
        msc: m.currentTrack,
        store: s?.currentTrack ?? null,
        snapshot: snap.currentTrack,
        ui: ui?.currentTrack ?? null,
      },
      compare: (a, b) => strEq(a as string | null, b as string | null),
    },
  ];

  const order: SyncAuditLayer[] = ["provider", "engine", "msc", "store", "snapshot", "ui"];

  for (const field of fields) {
    let prevLayer: SyncAuditLayer | null = null;
    let prevVal: unknown = null;
    for (const layer of order) {
      const val = field.layers[layer];
      if (val === undefined) continue;
      if (prevLayer !== null && !field.compare(prevVal, val)) {
        const divergence: SyncAuditDivergence = {
          ts: Date.now(),
          action,
          field: field.name,
          provider: field.layers.provider ?? null,
          engine: field.layers.engine ?? null,
          msc: field.layers.msc ?? null,
          store: field.layers.store ?? null,
          snapshot: field.layers.snapshot ?? null,
          ui: field.layers.ui ?? null,
          firstDivergentLayer: layer,
        };
        console.warn("[SYNC-AUDIT] DIVERGENCE", divergence);
        return divergence;
      }
      prevLayer = layer;
      prevVal = val;
    }
  }
  return null;
}

export function syncAuditClearFrame(): void {
  for (const k of Object.keys(frameBuffer) as SyncAuditLayer[]) {
    delete frameBuffer[k];
  }
}

export function syncAuditInstallWindowSample(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __syncAuditSample?: (action?: string) => Record<string, unknown> };
  w.__syncAuditSample = (action = lastAction) => {
    try {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      const { globalPlayerEngine } =
        require("@/lib/music/global-player-engine") as typeof import("@/lib/music/global-player-engine");
      const { usePlaybackStore } =
        require("@/stores/playback-store") as typeof import("@/stores/playback-store");
      const { __getCommittedPlaybackSnapshotForAudit } =
        require("@/lib/music/use-final-playback-snapshot") as typeof import("@/lib/music/use-final-playback-snapshot");

      const engine = globalPlayerEngine.getSnapshot();
      const msc = mediaSessionController.getState();
      const store = usePlaybackStore.getState();
      const finalSnap = __getCommittedPlaybackSnapshotForAudit();

      const slider = document.querySelector(".sb-slider, .player-seek") as HTMLInputElement | null;
      const elapsedEl = document.querySelector(".sb-seek .sb-time");
      const playBtn = document.querySelector('[data-player-play-pause="true"].sb-play') as HTMLElement | null;
      const pauseBtn = document.querySelector('[data-player-play-pause="true"].sb-pause') as HTMLElement | null;

      const ui = {
        sliderValue: slider ? Number(slider.value) : null,
        sliderMax: slider ? Number(slider.max) : null,
        elapsedLabel: elapsedEl?.textContent ?? null,
        playVisible: playBtn ? !playBtn.classList.contains("hidden") : null,
        pauseVisible: pauseBtn ? !pauseBtn.classList.contains("hidden") : null,
        currentTime: slider ? Number(slider.value) : null,
        duration: slider ? Number(slider.max) : null,
        isPlaying: pauseBtn ? !pauseBtn.classList.contains("hidden") : null,
        currentTrack: msc.activeTrack?.refId ?? null,
      };

      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "provider",
        currentTime: engine.currentTime,
        duration: engine.duration,
        isPlaying: engine.isPlaying,
        volume: null,
        muted: null,
        isLoading: engine.isLoading,
        currentTrack: engine.currentTrack?.refId ?? null,
      });
      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "engine",
        currentTime: engine.currentTime,
        duration: engine.duration,
        isPlaying: engine.isPlaying,
        volume: null,
        muted: null,
        isLoading: engine.isLoading,
        currentTrack: engine.currentTrack?.refId ?? null,
      });
      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "msc",
        currentTime: msc.currentTime,
        duration: msc.duration,
        isPlaying: msc.isPlaying,
        volume: msc.volume,
        muted: msc.muted,
        isLoading: msc.isBuffering || msc.isInitialLoading,
        currentTrack: msc.activeTrack?.refId ?? null,
        extra: {
          isSeeking: msc.isSeeking,
          seekPreviewTime: msc.seekPreviewTime,
        },
      });
      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "store",
        currentTime: store.currentTime,
        duration: store.duration,
        isPlaying: store.isPlaying,
        volume: store.volume,
        muted: store.muted,
        isLoading: store.isLoading,
        currentTrack: store.currentTrack?.refId ?? null,
      });

      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "snapshot",
        currentTime: finalSnap.currentTime,
        duration: finalSnap.duration,
        isPlaying: finalSnap.isPlaying,
        volume: finalSnap.volume,
        muted: finalSnap.muted,
        isLoading: finalSnap.isLoading,
        currentTrack: finalSnap.activeTrack?.refId ?? null,
        extra: {
          displayTime: finalSnap.displayTime,
          isSeeking: finalSnap.isSeeking,
          isScrubbing: finalSnap.isScrubbing,
        },
      });
      syncAuditRecord({
        ts: Date.now(),
        action,
        layer: "ui",
        currentTime: ui.currentTime,
        duration: ui.duration,
        isPlaying: ui.isPlaying,
        volume: null,
        muted: null,
        isLoading: null,
        currentTrack: ui.currentTrack,
        extra: ui,
      });

      const divergence = syncAuditCompareFrame(action);
      syncAuditClearFrame();
      return { action, engine, msc, store, finalSnap, ui, divergence };
    } catch (err) {
      return { error: String(err) };
    }
  };
}
