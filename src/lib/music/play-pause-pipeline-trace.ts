/**
 * Play/pause pipeline runtime trace — logging only.
 * Enable: localStorage.setItem('vf:play-pause-trace', '1')
 */

const STORAGE_KEY = "vf:play-pause-trace";

let traceSeq = 0;
const recentCommands: Array<{ event: string; ts: number }> = [];

export function isDuplicateCommand(event: string, windowMs = 80): boolean {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dup = recentCommands.some((c) => c.event === event && now - c.ts < windowMs);
  recentCommands.push({ event, ts: now });
  if (recentCommands.length > 32) recentCommands.shift();
  return dup;
}

export function isPlayPausePipelineTraceEnabled(): boolean {
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

export type PlayPauseTraceDetail = {
  fn: string;
  phase: string;
  event?: "play" | "pause" | "resume" | "toggle" | "playback_update";
  mscIsPlaying?: boolean | null;
  engineIsPlaying?: boolean | null;
  providerIsPlaying?: boolean | null;
  providerIsPaused?: boolean | null;
  snapshotIsPlaying?: boolean | null;
  storeIsPlaying?: boolean | null;
  uiPlayVisible?: boolean | null;
  uiPauseVisible?: boolean | null;
  activeTrack?: string | null;
  transportIntent?: "playing" | "paused" | null;
  transportPatched?: boolean | null;
  duplicateCommand?: boolean | null;
  note?: string;
  extra?: Record<string, unknown>;
};

export function playPausePipelineTrace(detail: PlayPauseTraceDetail): void {
  if (!isPlayPausePipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.log(`[PLAY-PAUSE-TRACE] ${detail.fn} ${detail.phase}`, { id, ts, ...detail });
}

export function playPauseTraceInstallWindowSample(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __playPauseTraceSample?: (label?: string) => Record<string, unknown>;
    __playPauseAudit?: {
      pause: () => void;
      resume: () => void;
      toggle: () => void;
      rapidToggle: (count: number, gapMs: number) => Promise<void>;
    };
  };

  w.__playPauseTraceSample = (label = "sample") => {
    try {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      const { globalPlayerEngine } =
        require("@/lib/music/global-player-engine") as typeof import("@/lib/music/global-player-engine");
      const { usePlaybackStore } =
        require("@/stores/playback-store") as typeof import("@/stores/playback-store");
      const { __getCommittedPlaybackSnapshotForAudit } =
        require("@/lib/music/use-final-playback-snapshot") as typeof import("@/lib/music/use-final-playback-snapshot");

      const msc = mediaSessionController.getState();
      const engine = globalPlayerEngine.getSnapshot();
      const store = usePlaybackStore.getState();
      const snapshot = __getCommittedPlaybackSnapshotForAudit();
      const playBtn = document.querySelector('[data-player-play-pause="true"].sb-play') as HTMLElement | null;
      const pauseBtn = document.querySelector('[data-player-play-pause="true"].sb-pause') as HTMLElement | null;

      const sample = {
        label,
        ts: Date.now(),
        msc: { isPlaying: msc.isPlaying, activeTrack: msc.activeTrack?.refId ?? null },
        engine: { isPlaying: engine.isPlaying, activeTrack: engine.currentTrack?.refId ?? null },
        store: { isPlaying: store.isPlaying, activeTrack: store.currentTrack?.refId ?? null },
        snapshot: { isPlaying: snapshot.isPlaying, activeTrack: snapshot.activeTrack?.refId ?? null },
        ui: {
          playVisible: playBtn ? !playBtn.classList.contains("hidden") : null,
          pauseVisible: pauseBtn ? !pauseBtn.classList.contains("hidden") : null,
        },
      };

      playPausePipelineTrace({
        fn: "__playPauseTraceSample",
        phase: label,
        mscIsPlaying: sample.msc.isPlaying,
        engineIsPlaying: sample.engine.isPlaying,
        snapshotIsPlaying: sample.snapshot.isPlaying,
        storeIsPlaying: sample.store.isPlaying,
        uiPlayVisible: sample.ui.playVisible,
        uiPauseVisible: sample.ui.pauseVisible,
        activeTrack: sample.msc.activeTrack,
        extra: sample,
      });

      return sample;
    } catch (err) {
      return { label, error: err instanceof Error ? err.message : String(err) };
    }
  };

  w.__playPauseAudit = {
    pause: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.pause();
    },
    resume: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.resume();
    },
    toggle: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.togglePlayPause();
    },
    rapidToggle: async (count: number, gapMs: number) => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      for (let i = 0; i < count; i += 1) {
        mediaSessionController.togglePlayPause();
        await new Promise((r) => setTimeout(r, gapMs));
      }
    },
  };
}
