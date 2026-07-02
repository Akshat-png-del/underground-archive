/**
 * Visual-only smoothing helpers for the audio player bar.
 * Does not read or write playback authority — consumes MediaSessionState snapshots.
 */

export const UI_CORRECTION_DEBOUNCE_MS = 180;
/** Hold play icon through short buffering / intent gaps (UI perception only). */
export const UI_PLAYING_HOLDOVER_MS = 250;
/** Hold buffering indicator steady through rapid provider toggles. */
export const UI_BUFFERING_HOLDOVER_MS = 250;
/** Collapse micro time-only React commits inside this window. */
export const UI_FRAME_COLLAPSE_MS = 100;
export const UI_SEEK_JUMP_THRESHOLD_S = 1.25;
export const UI_TIME_STABILIZATION_WINDOW_S = 1.25;
export const UI_TIME_EPSILON_S = 0.08;
export const UI_MICRO_TIME_MERGE_S = 0.35;
export const UI_INTERP_STEP_S = 0.12;
export const UI_ICON_CROSSFADE_MS = 150;

/** Reconcile display time — forward-only unless an explicit jump is allowed. */
export function reconcileDisplayTime(
  previous: number,
  incoming: number,
  allowJump: boolean,
  options?: { inStabilization?: boolean },
): number {
  if (!Number.isFinite(incoming) || incoming < 0) return previous;
  if (allowJump) return incoming;
  if (incoming + UI_TIME_EPSILON_S < previous) return previous;
  if (
    options?.inStabilization &&
    Math.abs(incoming - previous) < UI_TIME_STABILIZATION_WINDOW_S
  ) {
    return previous;
  }
  return incoming;
}

/** Stabilize duration — accept only on first load or significant change. */
export function reconcileDisplayDuration(
  previous: number,
  incoming: number,
  buffering: boolean,
): number {
  if (!Number.isFinite(incoming) || incoming <= 0) {
    return buffering && previous > 0 ? previous : previous;
  }
  if (previous <= 0) return incoming;
  if (Math.abs(incoming - previous) > 2) return incoming;
  if (incoming + UI_TIME_EPSILON_S < previous) return previous;
  return previous;
}

/** Hold play icon steady only while buffering reports paused mid-playback. */
export function reconcileDisplayPlaying(
  incoming: boolean,
  buffering: boolean,
  previous: boolean,
  holdUntilMs: number,
  nowMs: number,
): { isPlaying: boolean; holdUntilMs: number } {
  if (buffering && previous && !incoming) {
    return { isPlaying: true, holdUntilMs: nowMs + UI_PLAYING_HOLDOVER_MS };
  }
  if (buffering && incoming) {
    return { isPlaying: true, holdUntilMs: nowMs + UI_PLAYING_HOLDOVER_MS };
  }
  return { isPlaying: incoming, holdUntilMs: 0 };
}

/** Hold buffering UI steady when the provider flips rapidly. */
export function reconcileDisplayBuffering(
  incoming: boolean,
  stable: boolean,
  pending: boolean | null,
  settleUntil: number,
  nowMs: number,
): { stable: boolean; pending: boolean | null; settleUntil: number } {
  if (incoming === stable) {
    return { stable, pending: null, settleUntil: 0 };
  }
  if (pending === null) {
    return {
      stable,
      pending: incoming,
      settleUntil: nowMs + UI_BUFFERING_HOLDOVER_MS,
    };
  }
  if (nowMs < settleUntil) {
    return { stable, pending: incoming, settleUntil };
  }
  return { stable: pending, pending: null, settleUntil: 0 };
}

/** True when the only meaningful delta is a small forward time tick. */
export function isMicroTimeOnlyDelta(
  prev: {
    displayTime: number;
    isPlaying: boolean;
    duration: number;
    isBuffering: boolean;
    isInitialLoading: boolean;
    volume: number;
    muted: boolean;
    isSeeking: boolean;
    queueIndex: number;
    activeTrack: { refId: string } | null;
  },
  next: {
    displayTime: number;
    isPlaying: boolean;
    duration: number;
    isBuffering: boolean;
    isInitialLoading: boolean;
    volume: number;
    muted: boolean;
    isSeeking: boolean;
    queueIndex: number;
    activeTrack: { refId: string } | null;
  },
): boolean {
  if (prev.activeTrack?.refId !== next.activeTrack?.refId) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.duration !== next.duration) return false;
  if (prev.isBuffering !== next.isBuffering) return false;
  if (prev.isInitialLoading !== next.isInitialLoading) return false;
  if (prev.volume !== next.volume) return false;
  if (prev.muted !== next.muted) return false;
  if (prev.isSeeking !== next.isSeeking) return false;
  if (prev.queueIndex !== next.queueIndex) return false;
  const delta = next.displayTime - prev.displayTime;
  return delta > 0 && delta < UI_MICRO_TIME_MERGE_S;
}
