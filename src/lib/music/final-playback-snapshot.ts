import type { PlaybackItem } from "@/lib/music/playback";

/** Read-only UI snapshot published by useFinalPlaybackSnapshot(). */
export interface FinalPlaybackSnapshot {
  /** Arbitrated display position — alias: currentTime */
  displayTime: number;
  /** UI transport time (same as displayTime) */
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isScrubbing: boolean;
  activeTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  error: string | null;
  isBuffering: boolean;
  isInitialLoading: boolean;
  /** Buffering or initial load — alias for legacy UI */
  isLoading: boolean;
  isSeeking: boolean;
  volume: number;
  muted: boolean;
}
