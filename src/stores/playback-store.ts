import { create } from "zustand";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem } from "@/lib/music/playback";
import { isSamePlaybackItem } from "@/lib/music/playback";
import {
  clearPersistedPlayback,
  loadPersistedPlayback,
  savePersistedPlayback,
} from "@/lib/music/playback-persistence";
import { globalPlayerEngine } from "@/lib/music/global-player-engine";
import {
  playbackDebugLog,
  playbackDebugWarn,
  playbackDebugError,
  probePlaybackDom,
  installPlaybackDebugDump,
} from "@/lib/music/playback-debug";

type RecordPlayFn = (type: LibraryItemType, refId: string) => void;

let recordPlayFn: RecordPlayFn = () => {};
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let engineBound = false;
let pendingPlayItem: PlaybackItem | null = null;

function bindEngineListener(): void {
  globalPlayerEngine.setStateListener((patch) => {
    playbackDebugLog("LISTENER", "engine → store patch", patch);
    usePlaybackStore.setState(patch);
    const state = usePlaybackStore.getState();
    schedulePersist(state);
  });
}

function schedulePersist(state: Pick<PlaybackStore, "currentTrack" | "isPlaying" | "currentTime" | "queue">): void {
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

function buildQueue(prev: PlaybackStore, item: PlaybackItem): PlaybackItem[] {
  if (isSamePlaybackItem(prev.currentTrack, item)) return prev.queue;
  return [
    item,
    ...prev.queue.filter((entry) => !isSamePlaybackItem(entry, item)),
    ...(prev.currentTrack ? [prev.currentTrack] : []),
  ].slice(0, 50);
}

export interface PlaybackStore {
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  detailsOpen: boolean;
  hydrated: boolean;

  play: (item: PlaybackItem) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  previous: () => void;
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
  detailsOpen: false,
  hydrated: false,

  play: (item) => {
    if (!engineBound && typeof window !== "undefined") {
      playbackDebugWarn("MOUNT", "play requested before engine initialized — initializing now");
    }
    initializePlaybackEngine();

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
      return;
    }

    if (sameItem && !prev.isPlaying && !prev.error) {
      playbackDebugLog("STORE", "play() delegating to resume() — same item paused", item.refId);
      set({ isLoading: true, error: null });
      globalPlayerEngine.resume();
      schedulePersist(get());
      return;
    }

    if (prev.currentTrack && !sameItem) {
      playbackDebugLog("PLAYER", "stopping old track", { from: prev.currentTrack.refId, to: item.refId });
    }

    const queue = buildQueue(prev, item);
    const next = {
      currentTrack: item,
      queue,
      queueIndex: 0,
      error: null,
      detailsOpen: false,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      isPlaying: false,
    };
    set(next);
    playbackDebugLog("STORE", "state updated", {
      currentTrack: next.currentTrack?.refId,
      isLoading: next.isLoading,
      isPlaying: next.isPlaying,
    });
    schedulePersist({ ...get(), ...next });
    playbackDebugLog("ENGINE", "forwarding play to engine", item.refId);
    globalPlayerEngine.play(item);
  },

  pause: () => {
    playbackDebugLog("STORE", "pause() dispatched");
    set({ isPlaying: false, isLoading: false });
    globalPlayerEngine.pause();
  },

  resume: () => {
    playbackDebugLog("STORE", "resume() dispatched");
    set({ isLoading: true, error: null });
    globalPlayerEngine.resume();
  },

  stop: () => {
    playbackDebugLog("STORE", "stop() dispatched");
    globalPlayerEngine.stop();
    const next = {
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      error: null,
      detailsOpen: false,
    };
    set(next);
    clearPersistedPlayback();
  },

  seek: (seconds) => {
    globalPlayerEngine.seek(seconds);
  },

  next: () => {
    const { queue, queueIndex } = get();
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) return;
    set({ queueIndex: nextIndex });
    get().play(queue[nextIndex]);
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      get().seek(0);
      return;
    }
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) return;
    set({ queueIndex: prevIndex });
    get().play(queue[prevIndex]);
  },

  togglePlayPause: () => {
    const { currentTrack, isPlaying } = get();
    if (!currentTrack) return;
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

  globalPlayerEngine.mount();

  if (!engineBound) {
    engineBound = true;
    installPlaybackDebugDump();
    playbackDebugLog("MOUNT", "engine initialized");
    bindEngineListener();
  } else {
    playbackDebugLog("MOUNT", "engine re-bound after Fast Refresh");
    bindEngineListener();
  }

  const snap = globalPlayerEngine.getSnapshot();
  if (snap.currentTrack) {
    usePlaybackStore.setState({
      currentTrack: snap.currentTrack,
      isPlaying: snap.isPlaying,
      isLoading: snap.isLoading,
      currentTime: snap.currentTime,
      duration: snap.duration,
      error: snap.error,
    });
  }

  playbackDebugLog("DOM", "post-init probe", probePlaybackDom());

  if (pendingPlayItem) {
    const queued = pendingPlayItem;
    pendingPlayItem = null;
    playbackDebugLog("MOUNT", "resuming queued play after mount", queued.refId);
    globalPlayerEngine.play(queued);
    usePlaybackStore.setState({
      currentTrack: queued,
      isLoading: true,
      isPlaying: false,
      error: null,
    });
    return;
  }

  const session = globalPlayerEngine.getSnapshot();
  if (session.currentTrack && session.isPlaying) {
    usePlaybackStore.setState({
      currentTrack: session.currentTrack,
      isPlaying: session.isPlaying,
      isLoading: session.isLoading,
      currentTime: session.currentTime,
      duration: session.duration,
      error: session.error,
      hydrated: true,
    });
    return;
  }

  const persisted = loadPersistedPlayback();
  if (persisted?.current) {
    usePlaybackStore.setState({
      currentTrack: persisted.current,
      queue: persisted.queue,
      queueIndex: 0,
      isPlaying: false,
      isLoading: false,
      currentTime: persisted.position,
      hydrated: true,
    });
    if (persisted.isPlaying) {
      globalPlayerEngine.play(persisted.current);
    }
    return;
  }

  usePlaybackStore.setState({ hydrated: true });
}
