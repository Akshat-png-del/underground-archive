import { create } from "zustand";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import { isSamePlaybackItem } from "@/lib/music/playback";
import {
  clearPersistedPlayback,
  loadPersistedPlayback,
  savePersistedPlayback,
} from "@/lib/music/playback-persistence";
import {
  globalPlayerEngine,
  type PlayerEngineState,
} from "@/lib/music/global-player-engine";
import { registerPlaybackMediaAnchor } from "@/lib/music/playback-media-anchor-registry";
import { bootstrapMediaEngine } from "@/lib/music/media-engine-bootstrap";
import { mediaEngineEvents } from "@/lib/music/media-engine-events";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { logStateSync } from "@/lib/music/media-binding-debug";
import {
  playbackDebugLog,
  playbackDebugWarn,
  playbackDebugError,
  probePlaybackDom,
  installPlaybackDebugDump,
} from "@/lib/music/playback-debug";

type RecordPlayFn = (type: LibraryItemType, refId: string) => void;

/** Session + UI fields owned exclusively by the store. */
type SessionState = {
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  detailsOpen: boolean;
  hydrated: boolean;
};

/** Transport fields written only by the engine listener. */
type TransportState = {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  volume: number;
  muted: boolean;
};

let recordPlayFn: RecordPlayFn = () => {};
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let engineBound = false;
let pendingPlayItem: PlaybackItem | null = null;
let engineHydrating = false;

let storeBridgeAttached = false;
let audioEndedBridgeAttached = false;

/** Mirror MediaEngine snapshot into the store — view layer only. */
function applyEngineSnapshot(state: PlayerEngineState): void {
  const patch: Partial<TransportState & Pick<SessionState, "currentTrack">> = {
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    currentTime: state.currentTime,
    duration: state.duration,
    error: state.error,
  };

  logStateSync(patch);
  usePlaybackStore.setState(patch);
  schedulePersist(usePlaybackStore.getState());
}

function attachEngineStoreBridge(): void {
  if (storeBridgeAttached) return;
  storeBridgeAttached = true;
  globalPlayerEngine.setStateListener(applyEngineSnapshot);
  attachAudioEndedBridge();
}

/** Preview-audio tracks only — auto-advance queue when a track ends naturally. */
function attachAudioEndedBridge(): void {
  if (audioEndedBridgeAttached) return;
  audioEndedBridgeAttached = true;
  mediaEngineEvents.subscribe((event) => {
    if (event.type !== "onEnded" || !event.track) return;
    const resolved = resolvePlaybackSource(event.track);
    if (resolved.kind !== "preview") return;

    const store = usePlaybackStore.getState();
    const nextIndex = store.queueIndex + 1;
    if (nextIndex >= store.queue.length) return;

    playbackDebugLog("QUEUE", "audio ended — advancing queue", {
      from: event.track.refId,
      to: store.queue[nextIndex]?.refId,
      nextIndex,
    });
    store.play(store.queue[nextIndex], { browse: { queue: store.queue, queueIndex: nextIndex } });
  });
}

/** @internal Reset module state between contract tests. */
export function __resetPlaybackModuleForTests(): void {
  pendingPlayItem = null;
  engineBound = false;
  storeBridgeAttached = false;
  audioEndedBridgeAttached = false;
  engineHydrating = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

/** Engine/provider is the sole writer for transport state — store mirrors snapshots only. */
function applyTransportFromEngine(state: PlayerEngineState): void {
  applyEngineSnapshot(state);
}

function bindEngineListener(): void {
  attachEngineStoreBridge();
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

function resolveBrowseSession(
  item: PlaybackItem,
  options?: { queue?: PlaybackItem[]; queueIndex?: number; browse?: PlaybackBrowseContext },
): { queue: PlaybackItem[]; queueIndex: number } {
  const queue = options?.browse?.queue ?? options?.queue;
  const explicitIndex = options?.browse?.queueIndex ?? options?.queueIndex;

  if (queue && queue.length > 0) {
    const queueIndex =
      explicitIndex !== undefined && explicitIndex >= 0 && explicitIndex < queue.length
        ? explicitIndex
        : queue.findIndex((entry) => isSamePlaybackItem(entry, item));
    return { queue, queueIndex: queueIndex >= 0 ? queueIndex : 0 };
  }

  return { queue: [item], queueIndex: 0 };
}

export interface PlaybackStore extends SessionState, TransportState {
  play: (
    item: PlaybackItem,
    options?: { queue?: PlaybackItem[]; queueIndex?: number; browse?: PlaybackBrowseContext },
  ) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  togglePlayPause: () => void;
  openDetails: () => void;
  closeDetails: () => void;
  isActive: (type: PlaybackItem["type"], refId: string) => boolean;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
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

  play: (item, options) => {
    attachEngineStoreBridge();
    if (!engineBound && typeof window !== "undefined") {
      playbackDebugWarn("MOUNT", "play requested before engine initialized — initializing now");
      initializePlaybackEngine();
    } else if (typeof window !== "undefined" && !globalPlayerEngine.isEngineMounted()) {
      globalPlayerEngine.mount();
    }

    if (!globalPlayerEngine.isEngineMounted()) {
      pendingPlayItem = item;
      playbackDebugWarn("MOUNT", "play requested before root mount — queued", item.refId);
      return;
    }

    playbackDebugLog("STORE", "play() action dispatched", {
      type: item.type,
      refId: item.refId,
      title: item.title,
    });
    recordPlayFn(item.type, item.refId);
    const prev = get();
    const sameItem = isSamePlaybackItem(prev.currentTrack, item);

    if (sameItem && prev.isPlaying && !prev.error) {
      playbackDebugWarn("STORE", "play() early return — already playing same item", {
        refId: item.refId,
      });
      if (!prev.detailsOpen) set({ detailsOpen: true });
      return;
    }

    if (sameItem && prev.isLoading && !prev.error) {
      playbackDebugWarn("STORE", "play() early return — load already in flight", {
        refId: item.refId,
      });
      if (!prev.detailsOpen) set({ detailsOpen: true });
      return;
    }

    if (sameItem && !prev.isPlaying && !prev.error) {
      playbackDebugLog("STORE", "play() delegating to resume() — same item paused", item.refId);
      set({ detailsOpen: true });
      globalPlayerEngine.resume();
      schedulePersist(get());
      return;
    }

    if (prev.currentTrack && !sameItem) {
      playbackDebugLog("PLAYER", "stopping old track", {
        from: prev.currentTrack.refId,
        to: item.refId,
      });
    }

    const { queue, queueIndex } = resolveBrowseSession(item, options);
    playbackDebugLog("QUEUE", "play() updated browse queue", {
      refId: item.refId,
      queueIndex,
      queueLength: queue.length,
      queueIds: queue.map((q) => q.refId),
    });
    set({
      queue,
      queueIndex,
      detailsOpen: true,
      error: null,
    });
    schedulePersist(get());
    playbackDebugLog("ENGINE", "forwarding play to engine", item.refId);
    globalPlayerEngine.play(item);
  },

  pause: () => {
    playbackDebugLog("STORE", "pause() dispatched");
    globalPlayerEngine.pause();
  },

  resume: () => {
    playbackDebugLog("STORE", "resume() dispatched");
    globalPlayerEngine.resume();
  },

  stop: () => {
    playbackDebugLog("STORE", "stop() dispatched");
    globalPlayerEngine.stop();
    set({
      queue: [],
      queueIndex: 0,
      detailsOpen: false,
    });
    clearPersistedPlayback();
  },

  seek: (seconds) => {
    if (get().isLoading) return;
    playbackDebugLog("SEEK", "store seek() dispatched", { seconds });
    globalPlayerEngine.seek(seconds);
  },

  next: () => {
    const { queue, queueIndex, currentTrack, isLoading } = get();
    if (isLoading) return;
    const nextIndex = queueIndex + 1;
    playbackDebugLog("QUEUE", "next()", {
      queueIndex,
      nextIndex,
      queueLength: queue.length,
      currentRefId: currentTrack?.refId,
    });
    if (nextIndex >= queue.length) {
      playbackDebugWarn("QUEUE", "next() blocked — end of queue");
      return;
    }
    const nextItem = queue[nextIndex];
    if (!nextItem) return;
    get().play(nextItem, { browse: { queue, queueIndex: nextIndex } });
  },

  previous: () => {
    const { queue, queueIndex, currentTime, isLoading } = get();
    if (isLoading) return;
    playbackDebugLog("QUEUE", "previous()", { queueIndex, currentTime, queueLength: queue.length });
    if (currentTime > 3) {
      playbackDebugLog("SEEK", "previous() restarting current item", { currentTime });
      get().seek(0);
      return;
    }
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      playbackDebugWarn("QUEUE", "previous() blocked — start of queue");
      return;
    }
    get().play(queue[prevIndex], { browse: { queue, queueIndex: prevIndex } });
  },

  skipForward: (seconds = 10) => {
    if (get().isLoading) return;
    const { currentTime, duration } = get();
    const max = duration > 0 ? duration : currentTime + seconds;
    get().seek(Math.min(currentTime + seconds, max));
  },

  skipBackward: (seconds = 10) => {
    if (get().isLoading) return;
    const { currentTime } = get();
    get().seek(Math.max(0, currentTime - seconds));
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const muted = clamped === 0;
    set({ volume: clamped, muted });
    globalPlayerEngine.setVolume(clamped);
    globalPlayerEngine.setMuted(muted);
  },

  toggleMute: () => {
    const next = !get().muted;
    set({ muted: next });
    globalPlayerEngine.setMuted(next);
  },

  togglePlayPause: () => {
    const { currentTrack, isPlaying, isLoading } = get();
    if (!currentTrack || isLoading) return;
    if (isPlaying) get().pause();
    else get().resume();
  },

  openDetails: () => {
    if (get().currentTrack) set({ detailsOpen: true });
  },

  closeDetails: () => set({ detailsOpen: false }),

  isActive: (type, refId) => {
    const track = get().currentTrack;
    return !!track && track.type === type && track.refId === refId;
  },
}));

export function setPlaybackRecordFn(fn: RecordPlayFn): void {
  recordPlayFn = fn;
}

export function initializePlaybackEngine(): void {
  if (typeof window === "undefined") return;
  if (engineHydrating) return;

  engineHydrating = true;
  try {
    bootstrapMediaEngine();
    attachEngineStoreBridge();

    if (!engineBound) {
      engineBound = true;
      installPlaybackDebugDump();
      playbackDebugLog("MOUNT", "MediaEngine store bridge attached");
    } else {
      playbackDebugLog("MOUNT", "initializePlaybackEngine no-op — bridge already attached");
    }

    const snap = globalPlayerEngine.getSnapshot();
    if (snap.currentTrack) {
      applyEngineSnapshot(snap);
    }

    playbackDebugLog("DOM", "post-init probe", probePlaybackDom());

    if (pendingPlayItem) {
      const queued = pendingPlayItem;
      pendingPlayItem = null;
      playbackDebugLog("MOUNT", "resuming queued play after mount", queued.refId);
      getStorePlay()(queued);
      return;
    }

    const session = globalPlayerEngine.getSnapshot();
    if (session.currentTrack && session.isPlaying) {
      applyEngineSnapshot(session);
      usePlaybackStore.setState({ hydrated: true });
      return;
    }

    const persisted = loadPersistedPlayback();
    if (persisted?.current) {
      const queue = persisted.queue.length > 0 ? persisted.queue : [persisted.current];
      const found = queue.findIndex((entry) => isSamePlaybackItem(entry, persisted.current));
      const queueIndex = found >= 0 ? found : Math.max(0, queue.length - 1);
      usePlaybackStore.setState({
        queue,
        queueIndex,
        hydrated: true,
      });
      if (persisted.isPlaying) {
        playbackDebugLog("MOUNT", "resuming persisted playback", persisted.current.refId);
        getStorePlay()(persisted.current);
      } else {
        usePlaybackStore.setState({
          currentTrack: persisted.current,
          currentTime: persisted.position,
        });
      }
      return;
    }

    usePlaybackStore.setState({ hydrated: true });
  } finally {
    engineHydrating = false;
  }
}

function getStorePlay(): (item: PlaybackItem) => void {
  return usePlaybackStore.getState().play;
}

/** Reapply embed layout after player chrome geometry changes (stage open, dock). */
export function reapplyPlaybackEmbedLayout(): void {
  globalPlayerEngine.reapplyEmbedLayout();
}

/**
 * Dock #vitalforge-playback-root into the persistent embed host.
 * Pass a connected host element only — never call with null during UI lifecycle.
 */
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

/** Emergency recovery when the embed host was removed from the DOM. */
export function recoverPlaybackEngineToBody(): void {
  if (typeof document === "undefined") return;
  const root = document.getElementById("vitalforge-playback-root") as HTMLDivElement | null;
  if (!root) return;
  if (root.parentElement === document.body) return;
  playbackDebugLog("MOUNT", "recovering engine root to body");
  document.body.appendChild(root);
  globalPlayerEngine.reapplyEmbedLayout();
}
