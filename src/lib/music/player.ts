import type { PlaybackItem } from "@/lib/music/playback";
import { usePlaybackStore } from "@/stores/playback-store";

/**
 * Imperative global player API — all playback actions flow through the singleton engine.
 */
export const player = {
  play: (track: PlaybackItem) => usePlaybackStore.getState().play(track),
  pause: () => usePlaybackStore.getState().pause(),
  resume: () => usePlaybackStore.getState().resume(),
  stop: () => usePlaybackStore.getState().stop(),
  seek: (seconds: number) => usePlaybackStore.getState().seek(seconds),
  next: () => usePlaybackStore.getState().next(),
  previous: () => usePlaybackStore.getState().previous(),
  getState: () => usePlaybackStore.getState(),
};
