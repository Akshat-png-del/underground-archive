/**
 * Persistence / hydration pipeline runtime trace — logging only.
 * Enable: localStorage.setItem('vf:hydration-trace', '1')
 */

const STORAGE_KEY = "vf:hydration-trace";

let traceSeq = 0;
let hydrationStartCount = 0;
let hydrationFinishCount = 0;
let mirrorPushCount = 0;
let engineInitCount = 0;

export function isHydrationPipelineTraceEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

function nextId(): number {
  traceSeq += 1;
  return traceSeq;
}

export type HydrationLayerSnapshot = {
  activeTrack?: string | null;
  queueLength?: number;
  queueIndex?: number;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  volume?: number;
  muted?: boolean;
  detailsOpen?: boolean;
  hydrated?: boolean;
  engineMode?: string | null;
};

export type HydrationTraceDetail = {
  fn: string;
  phase: string;
  persisted?: HydrationLayerSnapshot | null;
  hydrated?: HydrationLayerSnapshot | null;
  msc?: HydrationLayerSnapshot | null;
  store?: HydrationLayerSnapshot | null;
  snapshot?: HydrationLayerSnapshot | null;
  engine?: HydrationLayerSnapshot | null;
  note?: string;
  extra?: Record<string, unknown>;
};

function readPersistedFromStorage(): HydrationLayerSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("vitalforge:playback");
    if (!raw) return null;
    const p = JSON.parse(raw) as {
      current?: { refId?: string } | null;
      isPlaying?: boolean;
      position?: number;
      queue?: unknown[];
    };
    return {
      activeTrack: p.current?.refId ?? null,
      queueLength: Array.isArray(p.queue) ? p.queue.length : 0,
      isPlaying: !!p.isPlaying,
      currentTime: typeof p.position === "number" ? p.position : 0,
    };
  } catch {
    return null;
  }
}

export function hydrationPipelineTrace(detail: HydrationTraceDetail): void {
  if (!isHydrationPipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.log(`[HYDRATION-TRACE] ${detail.fn} ${detail.phase}`, { id, ts, ...detail });
}

export function hydrationTraceMarkStart(fn: string): void {
  hydrationStartCount += 1;
  hydrationPipelineTrace({
    fn,
    phase: "hydration_started",
    note: `count=${hydrationStartCount}`,
    extra: { hydrationStartCount, hydrationFinishCount },
  });
}

export function hydrationTraceMarkFinish(fn: string, layers?: Partial<HydrationTraceDetail>): void {
  hydrationFinishCount += 1;
  hydrationPipelineTrace({
    fn,
    phase: "hydration_finished",
    note: `count=${hydrationFinishCount}`,
    extra: { hydrationStartCount, hydrationFinishCount },
    ...layers,
  });
}

export function hydrationTraceMarkMirror(fn: string): void {
  mirrorPushCount += 1;
}

export function hydrationTraceMarkEngineInit(fn: string): void {
  engineInitCount += 1;
}

export function hydrationTraceCounters(): Record<string, number> {
  return { hydrationStartCount, hydrationFinishCount, mirrorPushCount, engineInitCount };
}

function layerFromMsc(): HydrationLayerSnapshot {
  const { mediaSessionController } =
    require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
  const s = mediaSessionController.getState();
  return {
    activeTrack: s.activeTrack?.refId ?? null,
    queueLength: s.queue.length,
    queueIndex: s.queueIndex,
    currentTime: s.currentTime,
    duration: s.duration,
    isPlaying: s.isPlaying,
    volume: s.volume,
    muted: s.muted,
  };
}

function layerFromStore(): HydrationLayerSnapshot {
  const { usePlaybackStore } =
    require("@/stores/playback-store") as typeof import("@/stores/playback-store");
  const s = usePlaybackStore.getState();
  return {
    activeTrack: s.currentTrack?.refId ?? null,
    queueLength: s.queue.length,
    queueIndex: s.queueIndex,
    currentTime: s.currentTime,
    duration: s.duration,
    isPlaying: s.isPlaying,
    volume: s.volume,
    muted: s.muted,
    detailsOpen: s.detailsOpen,
    hydrated: s.hydrated,
  };
}

function layerFromSnapshot(): HydrationLayerSnapshot {
  const { __getCommittedPlaybackSnapshotForAudit } =
    require("@/lib/music/use-final-playback-snapshot") as typeof import("@/lib/music/use-final-playback-snapshot");
  const s = __getCommittedPlaybackSnapshotForAudit();
  return {
    activeTrack: s.activeTrack?.refId ?? null,
    queueLength: s.queue.length,
    queueIndex: s.queueIndex,
    currentTime: s.currentTime,
    duration: s.duration,
    isPlaying: s.isPlaying,
    volume: s.volume,
    muted: s.muted,
  };
}

function layerFromEngine(): HydrationLayerSnapshot {
  const { globalPlayerEngine } =
    require("@/lib/music/global-player-engine") as typeof import("@/lib/music/global-player-engine");
  const s = globalPlayerEngine.getSnapshot();
  return {
    activeTrack: s.currentTrack?.refId ?? null,
    currentTime: s.currentTime,
    duration: s.duration,
    isPlaying: s.isPlaying,
    engineMode: s.mode,
  };
}

export function hydrationTraceInstallWindowSample(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __hydrationTraceSample?: (label?: string) => Record<string, unknown>;
    __hydrationAudit?: {
      playPreview: () => void;
      playSpotifyFirst: () => void;
      pause: () => void;
      waitPersist: () => Promise<void>;
      readPersisted: () => HydrationLayerSnapshot | null;
      counters: () => Record<string, number>;
    };
  };

  w.__hydrationTraceSample = (label = "sample") => {
    const persisted = readPersistedFromStorage();
    const msc = layerFromMsc();
    const store = layerFromStore();
    const snapshot = layerFromSnapshot();
    const engine = layerFromEngine();
    const barVisible = !!document.querySelector("[data-player-shell]");
    const engineMount = !!document.querySelector("[data-playback-persistent-mount]");
    const playbackRoot = !!document.getElementById("vitalforge-playback-root");

    const sample = {
      label,
      ts: Date.now(),
      persisted,
      msc,
      store,
      snapshot,
      engine,
      ui: { barVisible, engineMount, playbackRoot },
      counters: hydrationTraceCounters(),
    };

    hydrationPipelineTrace({
      fn: "__hydrationTraceSample",
      phase: label,
      persisted,
      msc,
      store,
      snapshot,
      engine,
      extra: sample,
    });

    return sample;
  };

  w.__hydrationAudit = {
    playPreview: () => {
      const { playItem } = require("@/lib/music/playback-actions") as typeof import("@/lib/music/playback-actions");
      playItem({
        type: "track",
        refId: "hydration-audit::preview",
        label: "Hydration Audit Preview",
        title: "SoundHelix Preview",
        subtitle: "Audit",
        previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      });
    },
    playSpotifyFirst: () => {
      const el = document.querySelector('[id^="track-"]') as HTMLElement | null;
      el?.click();
    },
    pause: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.pause();
    },
    waitPersist: async () => {
      await new Promise((r) => setTimeout(r, 600));
    },
    readPersisted: () => readPersistedFromStorage(),
    counters: () => hydrationTraceCounters(),
  };
}
