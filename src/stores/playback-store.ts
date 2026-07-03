import { create } from "zustand";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem } from "@/lib/music/playback";
import { hydratePlaybackItem, hydratePlaybackQueue, isSamePlaybackItem } from "@/lib/music/playback";
import {
  clearPersistedPlayback,
  loadPersistedPlayback,
  savePersistedPlayback,
} from "@/lib/music/playback-persistence";
import { globalPlayerEngine } from "@/lib/music/global-player-engine";
import { registerPlaybackMediaAnchor } from "@/lib/music/playback-media-anchor-registry";
import { bootstrapMediaEngine } from "@/lib/music/media-engine-bootstrap";
import { mediaEngineEvents } from "@/lib/music/media-engine-events";
import {
  playbackDebugLog,
  playbackDebugWarn,
  probePlaybackDom,
  installPlaybackDebugDump,
} from "@/lib/music/playback-debug";
import { syncAuditInstallWindowSample } from "@/lib/music/playback-sync-audit";
import { volumeTraceInstallWindowSample } from "@/lib/music/volume-pipeline-trace";
import { queueTraceInstallWindowSample } from "@/lib/music/queue-pipeline-trace";
import { playPauseTraceInstallWindowSample } from "@/lib/music/play-pause-pipeline-trace";
import { hydrationTraceInstallWindowSample, hydrationTraceMarkStart, hydrationTraceMarkFinish, hydrationPipelineTrace } from "@/lib/music/hydration-pipeline-trace";

type RecordPlayFn = (type: LibraryItemType, refId: string) => void;

/** Render cache mirrored from MediaSessionController — not a source of truth. */
type MirroredTransportState = {
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  /** @internal Mirror only — UI must read useFinalPlaybackSnapshot().volume */
  volume: number;
  /** @internal Mirror only — UI must read useFinalPlaybackSnapshot().muted */
  muted: boolean;
};

type ChromeState = {
  detailsOpen: boolean;
  hydrated: boolean;
};

let recordPlayFn: RecordPlayFn = () => {};
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let engineBound = false;
let engineHydrating = false;
let storeBridgeAttached = false;
let audioEndedBridgeAttached = false;

function getController(): typeof import("@/lib/music/media-session-controller").mediaSessionController {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mediaSessionController } = require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
  return mediaSessionController;
}

/** @internal Called by MediaSessionController after mirroring into the store. */
export function schedulePlaybackPersist(): void {
  schedulePersist(usePlaybackStore.getState());
}

/** @internal Playback history hook used by controller on play. */
export function getPlaybackRecordFn(): RecordPlayFn {
  return recordPlayFn;
}

/** @internal Mount + bridge used by controller before transport commands. */
export function ensurePlaybackEngineReady(): void {
  attachEngineStoreBridge();
  if (!engineBound && typeof window !== "undefined") {
    playbackDebugWarn("MOUNT", "engine requested before init — initializing");
    initializePlaybackEngine();
  } else if (typeof window !== "undefined" && !globalPlayerEngine.isEngineMounted()) {
    globalPlayerEngine.mount();
  }
}

function attachEngineStoreBridge(): void {
  if (storeBridgeAttached) return;
  storeBridgeAttached = true;
  getController().attachEngineListener();
  attachAudioEndedBridge();
}

function attachAudioEndedBridge(): void {
  if (audioEndedBridgeAttached) return;
  audioEndedBridgeAttached = true;
  mediaEngineEvents.subscribe((event) => {
    if (event.type !== "onEnded" || !event.track) return;
    if (event.track.type !== "track") return;
    getController().advanceQueueOnEnd();
  });
}

/** @internal Reset module state between contract tests. */
export function __resetPlaybackModuleForTests(): void {
  engineBound = false;
  storeBridgeAttached = false;
  audioEndedBridgeAttached = false;
  engineHydrating = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

function schedulePersist(
  state: Pick<PlaybackStore, "currentTrack" | "isPlaying" | "currentTime" | "queue">,
): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (!state.currentTrack) {
      clearPersistedPlayback();
      return;
    }
    savePersistedPlayback({
      current: state.currentTrack,
      isPlaying: state.isPlaying,
      position: state.currentTime,
      queue: state.queue,
      updatedAt: Date.now(),
    });
  }, 400);
}

export interface PlaybackStore extends MirroredTransportState, ChromeState {
  openDetails: () => void;
  closeDetails: () => void;
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  error: null,
  volume: 1,
  muted: false,
  detailsOpen: false,
  hydrated: false,

  openDetails: () => {
    if (getController().getState().activeTrack) set({ detailsOpen: true });
  },

  closeDetails: () => set({ detailsOpen: false }),
}));

export function setPlaybackRecordFn(fn: RecordPlayFn): void {
  recordPlayFn = fn;
}

export function initializePlaybackEngine(): void {
  if (typeof window === "undefined") return;
  if (engineHydrating) {
    hydrationPipelineTrace({
      fn: "initializePlaybackEngine",
      phase: "skipped",
      note: "engineHydrating guard — duplicate hydration blocked",
    });
    return;
  }

  hydrationTraceMarkStart("initializePlaybackEngine");
  engineHydrating = true;
  try {
    bootstrapMediaEngine();
    attachEngineStoreBridge();

    if (!engineBound) {
      engineBound = true;
      installPlaybackDebugDump();
      syncAuditInstallWindowSample();
      volumeTraceInstallWindowSample();
      queueTraceInstallWindowSample();
      playPauseTraceInstallWindowSample();
      hydrationTraceInstallWindowSample();
      playbackDebugLog("MOUNT", "MediaEngine store bridge attached");
    }

    playbackDebugLog("DOM", "post-init probe", probePlaybackDom());

    const controller = getController();
    hydrationPipelineTrace({ fn: "MediaSessionController.initialize", phase: "flushPendingPlay" });
    controller.flushPendingPlay();

    const session = globalPlayerEngine.getSnapshot();
    if (session.currentTrack && session.isPlaying) {
      hydrationPipelineTrace({
        fn: "initializePlaybackEngine",
        phase: "early_return_engine_alive",
        engine: {
          activeTrack: session.currentTrack?.refId ?? null,
          isPlaying: session.isPlaying,
          currentTime: session.currentTime,
          engineMode: session.mode,
        },
      });
      usePlaybackStore.setState({ hydrated: true });
      hydrationTraceMarkFinish("initializePlaybackEngine", { note: "engine already playing" });
      return;
    }

    const persisted = loadPersistedPlayback();
    if (persisted?.current) {
      const current = hydratePlaybackItem(persisted.current);
      const queue = hydratePlaybackQueue(
        persisted.queue.length > 0 ? persisted.queue : [persisted.current],
      );
      const found = queue.findIndex((entry) => isSamePlaybackItem(entry, current));
      const queueIndex = found >= 0 ? found : Math.max(0, queue.length - 1);
      if (persisted.isPlaying) {
        playbackDebugLog("MOUNT", "resuming persisted playback", current.refId);
        hydrationPipelineTrace({
          fn: "restorePersistedSession",
          phase: "resume_play",
          persisted: {
            activeTrack: current.refId,
            queueLength: queue.length,
            queueIndex,
            currentTime: persisted.position,
            isPlaying: true,
          },
        });
        controller.play(current, {
          browse: { queue, queueIndex },
          resumePosition: persisted.position,
        });
        usePlaybackStore.setState({ hydrated: true });
      } else {
        hydrationPipelineTrace({
          fn: "restorePersistedSession",
          phase: "hydrate_paused",
          persisted: {
            activeTrack: current.refId,
            queueLength: queue.length,
            queueIndex,
            currentTime: persisted.position,
            isPlaying: false,
          },
        });
        controller.hydratePausedSession(current, persisted.position, queue, queueIndex);
      }
      hydrationTraceMarkFinish("initializePlaybackEngine", { note: "restored from persistence" });
      return;
    }

    usePlaybackStore.setState({ hydrated: true });
    hydrationTraceMarkFinish("initializePlaybackEngine", { note: "no persisted session" });
  } finally {
    engineHydrating = false;
  }
}

export function reapplyPlaybackEmbedLayout(): void {
  globalPlayerEngine.reapplyEmbedLayout();
}

export function dockPlaybackEngine(host: HTMLElement): void {
  if (typeof document === "undefined") return;
  const root = document.getElementById("vitalforge-playback-root") as HTMLDivElement | null;
  if (!root) return;

  if (!root.isConnected) {
    playbackDebugLog("MOUNT", "engine root was detached — recovering on body before dock");
    document.body.appendChild(root);
  }

  if (!host.isConnected) {
    playbackDebugWarn("MOUNT", "dock skipped — embed host not connected");
    return;
  }

  if (root.parentElement !== host) {
    playbackDebugLog("MOUNT", "relocating engine root into embed host");
    host.appendChild(root);
  }
  registerPlaybackMediaAnchor(host);
  globalPlayerEngine.reapplyEmbedLayout();
}

export function recoverPlaybackEngineToBody(): void {
  if (typeof document === "undefined") return;
  const root = document.getElementById("vitalforge-playback-root") as HTMLDivElement | null;
  if (!root) return;
  if (root.parentElement === document.body) return;
  playbackDebugLog("MOUNT", "recovering engine root to body");
  document.body.appendChild(root);
  globalPlayerEngine.reapplyEmbedLayout();
}
