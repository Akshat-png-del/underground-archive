import type { PlaybackItem } from "@/lib/music/playback";
import { hydrationPipelineTrace } from "@/lib/music/hydration-pipeline-trace";

const STORAGE_KEY = "vitalforge:playback";

export interface PersistedPlaybackState {
  current: PlaybackItem | null;
  isPlaying: boolean;
  position: number;
  queue: PlaybackItem[];
  updatedAt: number;
}

export const defaultPersistedPlayback = (): PersistedPlaybackState => ({
  current: null,
  isPlaying: false,
  position: 0,
  queue: [],
  updatedAt: Date.now(),
});

export function loadPersistedPlayback(): PersistedPlaybackState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      hydrationPipelineTrace({ fn: "loadPersistedPlayback", phase: "empty" });
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedPlaybackState;
    if (!parsed || typeof parsed !== "object") return null;
    const result = {
      current: parsed.current ?? null,
      isPlaying: !!parsed.isPlaying,
      position: typeof parsed.position === "number" ? parsed.position : 0,
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
    hydrationPipelineTrace({
      fn: "restorePersistedSession",
      phase: "load",
      persisted: {
        activeTrack: result.current?.refId ?? null,
        queueLength: result.queue.length,
        currentTime: result.position,
        isPlaying: result.isPlaying,
      },
      extra: { updatedAt: result.updatedAt },
    });
    return result;
  } catch {
    return null;
  }
}

export function savePersistedPlayback(state: PersistedPlaybackState): void {
  if (typeof window === "undefined") return;
  try {
    hydrationPipelineTrace({
      fn: "savePersistedPlayback",
      phase: "persist",
      persisted: {
        activeTrack: state.current?.refId ?? null,
        queueLength: state.queue.length,
        currentTime: state.position,
        isPlaying: state.isPlaying,
      },
    });
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: Date.now() }),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearPersistedPlayback(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
