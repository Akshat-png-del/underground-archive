/**
 * Spotify-feel frame sync clock — UI-only continuous render timing.
 * Snapshot is state input; this clock drives smooth monotonic display time.
 */
import type { FinalPlaybackSnapshot } from "@/lib/music/final-playback-snapshot";
import {
  reconcileDisplayDuration,
  UI_SEEK_JUMP_THRESHOLD_S,
  UI_TIME_EPSILON_S,
} from "@/lib/music/media-ui-smoothing";

const FEEL_CHASE_RATE = 0.16;
const FEEL_MAX_DT_S = 0.12;

export type PlaybackFeelClock = {
  trackId: string | null;
  displayTime: number;
  duration: number;
  lastTickMs: number;
  wasScrubbing: boolean;
  optimisticPlaying: boolean | null;
};

export function createPlaybackFeelClock(): PlaybackFeelClock {
  return {
    trackId: null,
    displayTime: 0,
    duration: 0,
    lastTickMs: 0,
    wasScrubbing: false,
    optimisticPlaying: null,
  };
}

export function mergeFeelClockIntoSnapshot(
  clock: PlaybackFeelClock,
  input: FinalPlaybackSnapshot,
  nowMs: number,
): { clock: PlaybackFeelClock; snapshot: FinalPlaybackSnapshot } {
  const trackId = input.activeTrack?.refId ?? null;
  const dtS =
    clock.lastTickMs > 0
      ? Math.min(Math.max(0, nowMs - clock.lastTickMs) / 1000, FEEL_MAX_DT_S)
      : 0;

  const trackChanged = trackId !== clock.trackId;
  const scrubbing = input.isScrubbing;
  const seekSnap =
    (clock.wasScrubbing && !scrubbing) ||
    Math.abs(input.displayTime - clock.displayTime) >= UI_SEEK_JUMP_THRESHOLD_S;

  let displayTime = clock.displayTime;

  if (trackChanged) {
    displayTime = input.displayTime;
  } else if (scrubbing) {
    displayTime = input.displayTime;
  } else if (seekSnap) {
    displayTime = input.displayTime;
  } else {
    const target = input.displayTime;
    let next = displayTime;

    if (input.isPlaying) {
      next = Math.max(next + dtS, displayTime);
      next += (target - next) * FEEL_CHASE_RATE;
    } else {
      next += (target - next) * FEEL_CHASE_RATE * 1.25;
    }

    if (next + UI_TIME_EPSILON_S < displayTime) {
      next = displayTime;
    }

    if (input.duration > 0) {
      next = Math.min(next, input.duration);
    }

    displayTime = next;
  }

  const duration = reconcileDisplayDuration(clock.duration, input.duration, input.isBuffering);

  let optimisticPlaying = clock.optimisticPlaying;
  let isPlaying = input.isPlaying;
  if (optimisticPlaying !== null) {
    isPlaying = optimisticPlaying;
    if (input.isPlaying === optimisticPlaying) {
      optimisticPlaying = null;
    }
  }

  const nextClock: PlaybackFeelClock = {
    trackId,
    displayTime,
    duration,
    lastTickMs: nowMs,
    wasScrubbing: scrubbing,
    optimisticPlaying,
  };

  return {
    clock: nextClock,
    snapshot: {
      ...input,
      displayTime,
      currentTime: displayTime,
      duration,
      isPlaying,
    },
  };
}

export function setFeelOptimisticPlaying(clock: PlaybackFeelClock, playing: boolean): void {
  clock.optimisticPlaying = playing;
}
