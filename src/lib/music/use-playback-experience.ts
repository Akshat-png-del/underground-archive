"use client";

import {
  resolvePlaybackExperience,
  type PlaybackExperience,
} from "@/lib/music/playback-experience";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

/** Read-only view of the active playback experience for UI routing. */
export function usePlaybackExperience(): PlaybackExperience {
  const { activeTrack: current } = useFinalPlaybackSnapshot();
  return resolvePlaybackExperience(current);
}
