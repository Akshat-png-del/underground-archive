"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import type { FinalPlaybackSnapshot } from "@/lib/music/final-playback-snapshot";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { resolveSetWatchSlug, setWatchPath } from "@/lib/sets/set-watch-navigation";

/** Ignore row activation when the pointer moved farther than this (scroll/drag guard). */
const ROW_TAP_MOVE_THRESHOLD_PX = 10;

export function playbackItemActive(
  snapshot: FinalPlaybackSnapshot,
  type: LibraryItemType,
  refId: string,
): boolean {
  return snapshot.activeTrack?.type === type && snapshot.activeTrack?.refId === refId;
}

export function playbackItemPlaying(
  snapshot: FinalPlaybackSnapshot,
  type: LibraryItemType,
  refId: string,
): boolean {
  return playbackItemActive(snapshot, type, refId) && snapshot.isPlaying;
}

function isAudioPlayerUiAtPoint(clientX: number, clientY: number): boolean {
  if (typeof document === "undefined") return false;
  return document.elementsFromPoint(clientX, clientY).some((el) => {
    if (!(el instanceof Element)) return false;
    return !!el.closest("[data-audio-player], [data-player-control]");
  });
}

function isAudioPlayerUiTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-audio-player], [data-player-control]");
}

/**
 * Pointer/keyboard dispatch only — no playback state reads.
 * Pair with useFinalPlaybackSnapshot() for active/playing UI.
 */
export function useCardPlayback(
  item: PlaybackItem,
  type: LibraryItemType,
  refId: string,
  browse?: PlaybackBrowseContext,
  setSlug?: string,
) {
  const router = useRouter();
  const pendingPressRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const activateCard = useCallback(() => {
    if (type === "set") {
      const slug = resolveSetWatchSlug(refId, setSlug);
      if (slug) {
        router.push(setWatchPath(slug));
        return;
      }
    }
    const active = mediaSessionController.isActive(type, refId);
    if (active) {
      mediaSessionController.togglePlayPause();
      return;
    }
    mediaSessionController.play(item, browse ? { browse } : undefined);
  }, [item, type, refId, browse, setSlug, router]);

  const handleCardPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      if (isAudioPlayerUiTarget(e.target)) return;
      if (isAudioPlayerUiAtPoint(e.clientX, e.clientY)) return;

      const origin = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      pendingPressRef.current = origin;

      const finishPress = (ev: PointerEvent) => {
        if (pendingPressRef.current?.pointerId !== ev.pointerId) return;
        const start = pendingPressRef.current;
        pendingPressRef.current = null;
        document.removeEventListener("pointerup", finishPress);
        document.removeEventListener("pointercancel", finishPress);

        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (dx * dx + dy * dy > ROW_TAP_MOVE_THRESHOLD_PX * ROW_TAP_MOVE_THRESHOLD_PX) {
          return;
        }
        if (isAudioPlayerUiAtPoint(ev.clientX, ev.clientY)) return;

        activateCard();
      };

      document.addEventListener("pointerup", finishPress);
      document.addEventListener("pointercancel", finishPress);
    },
    [activateCard],
  );

  const handleCardActivate = useCallback(() => {
    activateCard();
  }, [activateCard]);

  const stopCardPointerDown = useCallback((e: ReactPointerEvent) => {
    e.stopPropagation();
    pendingPressRef.current = null;
  }, []);

  return {
    handleCardPointerDown,
    handleCardActivate,
    stopCardPointerDown,
  };
}
