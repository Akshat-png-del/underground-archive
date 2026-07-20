/**
 * Queue / next / prev pipeline runtime trace — logging only.
 * Enable: localStorage.setItem('vf:queue-trace', '1')
 */

import type { PlaybackItem } from "@/lib/music/playback";

const STORAGE_KEY = "vf:queue-trace";

let traceSeq = 0;

export function isQueuePipelineTraceEnabled(): boolean {
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

function refId(track: PlaybackItem | null | undefined): string | null {
  return track?.refId ?? null;
}

export type QueueTraceDetail = {
  fn: string;
  phase: string;
  initiator?: string;
  event?: string;
  queueLength?: number | null;
  currentQueueIndex?: number | null;
  targetQueueIndex?: number | null;
  currentActiveTrack?: string | null;
  targetActiveTrack?: string | null;
  mscActiveTrack?: string | null;
  engineActiveTrack?: string | null;
  snapshotActiveTrack?: string | null;
  storeActiveTrack?: string | null;
  uiActiveTrack?: string | null;
  mscQueueIndex?: number | null;
  snapshotQueueIndex?: number | null;
  storeQueueIndex?: number | null;
  trackChanged?: boolean | null;
  queueReconciledIndex?: number | null;
  transportPatched?: boolean | null;
  pendingPlay?: boolean | null;
  providerKind?: string | null;
  duplicatePlay?: boolean | null;
  currentTime?: number | null;
  note?: string;
  extra?: Record<string, unknown>;
};

export function queuePipelineTrace(detail: QueueTraceDetail): void {
  if (!isQueuePipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.log(`[QUEUE-TRACE] ${detail.fn} ${detail.phase}`, { id, ts, ...detail });
}

export function queueTraceRef(track: PlaybackItem | null | undefined): string | null {
  return refId(track);
}

export function queueTraceInstallWindowSample(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __queueTraceSample?: (label?: string) => Record<string, unknown>;
    __queueAudit?: {
      next: () => void;
      prev: () => void;
      advanceOnEnd: () => void;
      seekToStart: () => void;
      playTrackAt: (index: number) => void;
    };
  };

  w.__queueTraceSample = (label = "sample") => {
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
      const titleEl = document.querySelector(".sb-title, .player-track-title, [data-player-title]");
      const uiTitle = titleEl?.textContent?.trim() ?? null;

      const sample = {
        label,
        ts: Date.now(),
        msc: {
          activeTrack: msc.activeTrack?.refId ?? null,
          queueIndex: msc.queueIndex,
          queueLength: msc.queue.length,
          currentTime: msc.currentTime,
        },
        engine: {
          activeTrack: engine.currentTrack?.refId ?? null,
          mode: engine.mode,
        },
        store: {
          activeTrack: store.currentTrack?.refId ?? null,
          queueIndex: store.queueIndex,
          queueLength: store.queue?.length ?? 0,
        },
        snapshot: {
          activeTrack: snapshot.activeTrack?.refId ?? null,
          queueIndex: snapshot.queueIndex,
          queueLength: snapshot.queue.length,
        },
        ui: { title: uiTitle },
      };

      queuePipelineTrace({
        fn: "__queueTraceSample",
        phase: label,
        mscActiveTrack: sample.msc.activeTrack,
        engineActiveTrack: sample.engine.activeTrack,
        snapshotActiveTrack: sample.snapshot.activeTrack,
        storeActiveTrack: sample.store.activeTrack,
        uiActiveTrack: uiTitle,
        mscQueueIndex: sample.msc.queueIndex,
        snapshotQueueIndex: sample.snapshot.queueIndex,
        storeQueueIndex: sample.store.queueIndex,
        queueLength: sample.msc.queueLength,
        extra: sample,
      });

      return sample;
    } catch (err) {
      return { label, error: err instanceof Error ? err.message : String(err) };
    }
  };

  w.__queueAudit = {
    next: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.next();
    },
    prev: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.prev();
    },
    advanceOnEnd: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.advanceQueueOnEnd();
    },
    seekToStart: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.commitSeek(0);
    },
    playTrackAt: (index: number) => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      const { usePlaybackStore } =
        require("@/stores/playback-store") as typeof import("@/stores/playback-store");
      const store = usePlaybackStore.getState();
      const item = store.queue?.[index];
      if (!item) return;
      mediaSessionController.play(item, { browse: { queue: store.queue, queueIndex: index } });
    },
  };
}
