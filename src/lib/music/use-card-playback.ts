"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem } from "@/lib/music/playback";
import { usePlayback } from "@/context/PlaybackContext";
import { playbackDebugLog } from "@/lib/music/playback-debug";

/** Whole-card play / pause / resume — use on row/card parent via onPointerDown. */
export function useCardPlayback(item: PlaybackItem, type: LibraryItemType, refId: string) {
  const { playNow, togglePlayPause, isActive, isPlaying } = usePlayback();
  const active = isActive(type, refId);
  const playing = active && isPlaying;

  const handleCardPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      playbackDebugLog("CLICK", "card pointerdown", { type, refId, title: item.title });
      if (active && isPlaying) {
        togglePlayPause();
        return;
      }
      playNow(item);
    },
    [active, isPlaying, togglePlayPause, playNow, item, type, refId],
  );

  const stopCardPointerDown = useCallback((e: ReactPointerEvent) => {
    e.stopPropagation();
  }, []);

  return { handleCardPointerDown, stopCardPointerDown, active, playing };
}

export function youtubeDisplayEmbedUrl(youtubeId: string): string {
  const params = new URLSearchParams({
    rel: "0",
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
}
