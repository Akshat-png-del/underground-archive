"use client";

import { useLayoutEffect } from "react";
import { GlobalPlayer } from "@/components/music/GlobalPlayer";
import { initializePlaybackEngine } from "@/stores/playback-store";
import { playbackDebugLog, probePlaybackDom } from "@/lib/music/playback-debug";

/**
 * Root playback shell — mounted once in app/layout.tsx.
 * Owns the singleton DOM audio engine and global player UI.
 */
export function PlaybackRoot() {
  useLayoutEffect(() => {
    playbackDebugLog("MOUNT", "PlaybackRoot mounted");
    initializePlaybackEngine();
    playbackDebugLog("MOUNT", "PlaybackRoot init complete", probePlaybackDom());
    assertPlaybackSingleton();

    return () => {
      playbackDebugLog("MOUNT", "PlaybackRoot unmounted");
    };
  }, []);

  return <GlobalPlayer />;
}

function assertPlaybackSingleton(): void {
  if (typeof document === "undefined") return;
  const roots = document.querySelectorAll("#vitalforge-playback-root");
  if (roots.length > 1) {
    playbackDebugLog("MOUNT", "[INVARIANT FAILED] multiple roots", { count: roots.length });
  }
}
