"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import { handlePlaybackSurfaceClick } from "@/lib/music/playback-actions";
import { usePlaybackStore } from "@/stores/playback-store";
import { resolveSetWatchSlug, setWatchPath } from "@/lib/sets/set-watch-navigation";

/**
 * Thin UI hook — renders active/playing state and dispatches to the actions layer.
 * Sets navigate to /sets/[slug]; tracks use playback actions.
 */
export function useCardPlayback(
  item: PlaybackItem,
  type: LibraryItemType,
  refId: string,
  browse?: PlaybackBrowseContext,
  setSlug?: string,
) {
  const router = useRouter();
  const active = usePlaybackStore((s) => s.isActive(type, refId));
  const playing = usePlaybackStore((s) => s.isActive(type, refId) && s.isPlaying);

  const handleCardPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      if (type === "set") {
        const slug = resolveSetWatchSlug(refId, setSlug);
        if (slug) {
          router.push(setWatchPath(slug));
          return;
        }
      }
      handlePlaybackSurfaceClick(item, type, refId, browse ? { browse } : undefined);
    },
    [item, type, refId, browse, setSlug, router],
  );

  const stopCardPointerDown = useCallback((e: ReactPointerEvent) => {
    e.stopPropagation();
  }, []);

  return { handleCardPointerDown, stopCardPointerDown, active, playing };
}
