"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import type { ArchiveSet } from "@/types/library";
import { playbackItemFromSet } from "@/lib/music/playback";
import { playItem, stopPlayback } from "@/lib/music/playback-actions";
import {
  dockPlaybackEngine,
  recoverPlaybackEngineToBody,
  reapplyPlaybackEmbedLayout,
} from "@/stores/playback-store";
import { canShowSetVideoEmbed } from "@/lib/music/set-display";
import {
  claimSetWatchDock,
  releaseSetWatchDock,
} from "@/lib/sets/set-watch-dock";
import { usePlaybackStore } from "@/stores/playback-store";
import { playbackDebugLog } from "@/lib/music/playback-debug";

/**
 * Docks the singleton playback engine into the set watch host and starts playback.
 * Cleans up iframe + session when leaving /sets/[slug].
 *
 * FROZEN — see docs/sets-video-architecture-freeze.md
 */
export function useSetWatchDock(set: ArchiveSet): RefObject<HTMLDivElement | null> {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!canShowSetVideoEmbed(set.youtubeId)) return;

    claimSetWatchDock();

    const item = playbackItemFromSet(set);

    const dock = (): void => {
      const host = hostRef.current;
      if (!host?.isConnected) return;
      dockPlaybackEngine(host);
      reapplyPlaybackEmbedLayout();
    };

    dock();
    requestAnimationFrame(dock);

    const state = usePlaybackStore.getState();
    if (!state.isActive("set", set.id)) {
      playbackDebugLog("MOUNT", "set watch autoplay", { refId: set.id });
      playItem(item);
    } else {
      reapplyPlaybackEmbedLayout();
    }

    return () => {
      const latest = usePlaybackStore.getState();
      if (latest.isActive("set", set.id)) {
        playbackDebugLog("MOUNT", "set watch teardown — stopping playback", { refId: set.id });
        stopPlayback();
      }
      releaseSetWatchDock();
      recoverPlaybackEngineToBody();
    };
  }, [set.id, set.youtubeId]);

  return hostRef;
}
