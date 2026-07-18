"use client";

import { useLayoutEffect } from "react";
import { usePlaybackExperience } from "@/lib/music/use-playback-experience";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { assertPlaybackUiInvariants } from "@/lib/music/playback-ui-invariants";

/**
 * Dev-only runtime guard for playback UI composition invariants.
 * Fails immediately when layout CSS or experience surfaces drift.
 */
export function PlaybackUiInvariantGuard() {
  const experience = usePlaybackExperience();
  const activeTrack = useFinalPlaybackSnapshot().activeTrack;

  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    // Assert on experience/track changes only. Do not observe document childList —
    // assertPlaybackLayoutCssLoaded mutates the DOM and would infinite-loop the app.
    assertPlaybackUiInvariants({ experience, activeTrack });
  }, [experience, activeTrack]);

  return null;
}
