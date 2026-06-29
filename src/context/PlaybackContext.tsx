"use client";

import { useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import type { PlaybackItem } from "@/lib/music/playback";
import { playbackDebugLog } from "@/lib/music/playback-debug";

/** @deprecated Prefer usePlaybackStore directly. Kept for existing components. */
export function usePlayback() {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isLoading = usePlaybackStore((s) => s.isLoading);
  const detailsOpen = usePlaybackStore((s) => s.detailsOpen);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const queue = usePlaybackStore((s) => s.queue);
  const error = usePlaybackStore((s) => s.error);
  const play = usePlaybackStore((s) => s.play);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const stop = usePlaybackStore((s) => s.stop);
  const openDetails = usePlaybackStore((s) => s.openDetails);
  const closeDetails = usePlaybackStore((s) => s.closeDetails);
  const isActive = usePlaybackStore((s) => s.isActive);

  const playNow = useCallback(
    (item: PlaybackItem) => {
      playbackDebugLog("CLICK", "playNow() called from UI", {
        type: item.type,
        refId: item.refId,
        title: item.title,
      });
      playbackDebugLog("TRACK", "Track ID", item.refId);
      play(item);
    },
    [play],
  );

  return {
    current: currentTrack,
    isPlaying,
    isLoading,
    detailsOpen,
    position: currentTime,
    queue,
    playbackError: error,
    playNow,
    togglePlayPause,
    stop,
    openDetails,
    closeDetails,
    isActive,
  };
}

export type { PlaybackItem };
