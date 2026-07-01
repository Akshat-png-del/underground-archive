import { usePlaybackStore } from "@/stores/playback-store";

/** Duration from MediaEngine only — UI never estimates or calculates time. */
export function usePlaybackDuration(): number {
  return usePlaybackStore((s) => s.duration);
}
