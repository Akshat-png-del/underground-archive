"use client";

import { usePlaybackStore } from "@/stores/playback-store";
import {
  resolvePlaybackExperience,
  type PlaybackExperience,
} from "@/lib/music/playback-experience";

/** Read-only view of the active playback experience for UI routing. */
export function usePlaybackExperience(): PlaybackExperience {
  const current = usePlaybackStore((s) => s.currentTrack);
  return resolvePlaybackExperience(current);
}
