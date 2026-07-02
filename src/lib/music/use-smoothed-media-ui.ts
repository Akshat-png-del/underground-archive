"use client";

import type { MediaSessionState } from "@/lib/music/media-session-controller";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

export interface SmoothedMediaUi {
  /** Arbitrated render snapshot — not raw controller stream. */
  session: MediaSessionState;
  displayTime: number;
  duration: number;
  isPlaying: boolean;
  isScrubbing: boolean;
}

/** @deprecated Prefer useFinalPlaybackSnapshot() for player chrome. */
export function useSmoothedMediaUi(): SmoothedMediaUi {
  const final = useFinalPlaybackSnapshot();

  const session: MediaSessionState = {
    activeTrack: final.activeTrack,
    queue: final.queue,
    queueIndex: final.queueIndex,
    currentTime: final.displayTime,
    duration: final.duration,
    isPlaying: final.isPlaying,
    isBuffering: final.isBuffering,
    isInitialLoading: final.isInitialLoading,
    volume: final.volume,
    muted: final.muted,
    error: final.error,
    isSeeking: final.isSeeking,
    seekPreviewTime: null,
    hoverPreviewTime: null,
  };

  return {
    session,
    displayTime: final.displayTime,
    duration: final.duration,
    isPlaying: final.isPlaying,
    isScrubbing: final.isScrubbing,
  };
}
