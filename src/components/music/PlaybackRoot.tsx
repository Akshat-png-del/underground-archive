"use client";

import { useLayoutEffect } from "react";
import { AudioPlayerBar } from "@/components/music/AudioPlayerBar";
import { PlaybackEngineMount } from "@/components/music/PlaybackEngineMount";
import { PlaybackExperienceDocument } from "@/components/music/PlaybackExperienceDocument";
import { bootstrapMediaEngine } from "@/lib/music/media-engine-bootstrap";
import { initializePlaybackEngine } from "@/stores/playback-store";
import { playbackDebugLog, probePlaybackDom } from "@/lib/music/playback-debug";
import { logUiPlayerRemoved } from "@/lib/music/media-binding-debug";

/**
 * Root playback shell — mounted once in app/layout.tsx.
 *
 * One engine mount; separate audio and video UI experiences.
 */
export function PlaybackRoot() {
  useLayoutEffect(() => {
    logUiPlayerRemoved("Split experience — engine mount + audio bar");
    playbackDebugLog("MOUNT", "PlaybackRoot mounted");
    bootstrapMediaEngine();
    initializePlaybackEngine();
    playbackDebugLog("MOUNT", "PlaybackRoot init complete", probePlaybackDom());
    assertPlaybackSingleton();

    return () => {
      playbackDebugLog("MOUNT", "PlaybackRoot unmounted — engine intentionally preserved");
    };
  }, []);

  return (
    <>
      <PlaybackExperienceDocument />
      <PlaybackEngineMount />
      <AudioPlayerBar />
    </>
  );
}

function assertPlaybackSingleton(): void {
  if (typeof document === "undefined") return;
  const roots = document.querySelectorAll("#vitalforge-playback-root");
  if (roots.length > 1) {
    playbackDebugLog("MOUNT", "[INVARIANT FAILED] multiple roots", { count: roots.length });
  }
  const canvases = document.querySelectorAll("#media-engine-canvas");
  if (canvases.length > 1) {
    playbackDebugLog("MOUNT", "[INVARIANT FAILED] multiple media canvases", { count: canvases.length });
  }
}
