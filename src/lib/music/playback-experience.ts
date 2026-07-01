import type { PlaybackItem } from "@/lib/music/playback";
import { isVideoPlaybackItem } from "@/lib/music/playback";

/**
 * UI experience boundary — separates audio and video surfaces.
 *
 * FROZEN — see docs/sets-video-architecture-freeze.md
 * One playback engine; two user-facing experiences.
 * This module is view-layer only. It must not dispatch transport or mutate session state.
 */
export type PlaybackExperience = "idle" | "audio" | "video";

export function resolvePlaybackExperience(item: PlaybackItem | null | undefined): PlaybackExperience {
  if (!item) return "idle";
  if (isVideoPlaybackItem(item)) return "video";
  return "audio";
}

export function isAudioExperienceItem(item: PlaybackItem): boolean {
  return resolvePlaybackExperience(item) === "audio";
}

export function isVideoExperienceItem(item: PlaybackItem): boolean {
  return resolvePlaybackExperience(item) === "video";
}

/** Document dataset value for layout chrome (padding, mode). */
export function playbackExperienceDatasetValue(
  experience: PlaybackExperience,
): "audio" | undefined {
  return experience === "audio" ? "audio" : undefined;
}
