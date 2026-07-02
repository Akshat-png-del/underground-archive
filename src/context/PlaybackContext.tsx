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
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

/**
 * @deprecated Use useFinalPlaybackSnapshot() for reads and mediaSessionController / playback-actions for writes.
 */
export function usePlayback() {
  const snapshot = useFinalPlaybackSnapshot();
  const detailsOpen = usePlaybackStore((s) => s.detailsOpen);

  const playNow = useCallback((item: PlaybackItem) => playItem(item), []);
  const togglePlayPause = useCallback(() => togglePlayback(), []);
  const stop = useCallback(() => stopPlayback(), []);
  const openDetails = useCallback(() => openPlayerSurface(), []);
  const closeDetails = useCallback(() => closePlayerSurface(), []);

  const isActive = useCallback(
    (type: PlaybackItem["type"], refId: string) =>
      snapshot.activeTrack?.type === type && snapshot.activeTrack?.refId === refId,
    [snapshot.activeTrack],
  );

  return {
    ...snapshot,
    current: snapshot.activeTrack,
    position: snapshot.currentTime,
    detailsOpen,
    playbackError: snapshot.error,
    playNow,
    togglePlayPause,
    stop,
    openDetails,
    closeDetails,
    isActive,
  };
}

export type { PlaybackItem };
