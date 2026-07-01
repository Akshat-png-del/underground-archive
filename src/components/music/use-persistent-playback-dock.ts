"use client";

import { useLayoutEffect, type RefObject } from "react";
import { dockPlaybackEngine, reapplyPlaybackEmbedLayout } from "@/stores/playback-store";
import { playbackDebugLog } from "@/lib/music/playback-debug";
import { isSetWatchDockActive } from "@/lib/sets/set-watch-dock";

/**
 * Docks #vitalforge-playback-root into the embed host once.
 *
 * CRITICAL: No cleanup — reparenting the engine on UI unmount breaks embed playback.
 * The media engine must survive all React rerenders, route changes, and layout updates.
 */
export function usePersistentPlaybackDock(
  hostRef: RefObject<HTMLDivElement | null>,
  enabled = true,
): void {
  useLayoutEffect(() => {
    if (!enabled) return;

    const dock = (): boolean => {
      if (isSetWatchDockActive()) return false;
      const host = hostRef.current;
      if (!host) return false;
      dockPlaybackEngine(host);
      reapplyPlaybackEmbedLayout();
      playbackDebugLog("MOUNT", "persistent playback dock attached", {
        hostConnected: host.isConnected,
      });
      return true;
    };

    if (dock()) return;

    const frame = requestAnimationFrame(() => {
      dock();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [hostRef, enabled]);
}
