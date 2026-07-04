"use client";

import { useLayoutEffect } from "react";
import { usePlaybackExperience } from "@/lib/music/use-playback-experience";
import { playbackExperienceDatasetValue } from "@/lib/music/playback-experience";

/**
 * Syncs document-level layout tokens for the audio experience only.
 * Video experience uses in-page watch surfaces — no bottom bar chrome.
 */
export function PlaybackExperienceDocument() {
  const experience = usePlaybackExperience();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const mode = playbackExperienceDatasetValue(experience);

    if (mode) {
      root.dataset.playbackExperience = mode;
      root.style.setProperty("--player-bar-height", "5.75rem");
    } else {
      delete root.dataset.playbackExperience;
      root.style.removeProperty("--player-bar-height");
    }

    return () => {
      delete root.dataset.playbackExperience;
      root.style.removeProperty("--player-bar-height");
    };
  }, [experience]);

  return null;
}
