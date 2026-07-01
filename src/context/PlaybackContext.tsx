"use client";

import { useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import type { PlaybackItem } from "@/lib/music/playback";
import {
  playItem,
  togglePlayback,
  openPlayerSurface,
  closePlayerSurface,
  stopPlayback,
} from "@/lib/music/playback-actions";

/**
 * @deprecated Prefer usePlaybackStore selectors + playback-actions dispatchers.
 * Thin read-only facade for legacy components.
 */
export function usePlayback() {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isLoading = usePlaybackStore((s) => s.isLoading);
  const detailsOpen = usePlaybackStore((s) => s.detailsOpen);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const queue = usePlaybackStore((s) => s.queue);
  const error = usePlaybackStore((s) => s.error);
  const isActive = usePlaybackStore((s) => s.isActive);

  const playNow = useCallback((item: PlaybackItem) => playItem(item), []);
  const togglePlayPause = useCallback(() => togglePlayback(), []);
  const stop = useCallback(() => stopPlayback(), []);
  const openDetails = useCallback(() => openPlayerSurface(), []);
  const closeDetails = useCallback(() => closePlayerSurface(), []);

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
