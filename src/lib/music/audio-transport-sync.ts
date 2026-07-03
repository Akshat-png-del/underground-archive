/** Clamp playback position to a known duration when available. */
export function clampPlaybackPosition(seconds: number, duration: number): number {
  const clamped = Math.max(0, seconds);
  if (duration > 0) return Math.min(clamped, duration);
  return clamped;
}

/** Accept provider position updates while a seek is settling (ignore stale pre-seek ticks). */
export function shouldAcceptPositionAfterSeek(
  positionSeconds: number,
  pendingSeekSeconds: number | null,
  pendingSeekDeadline: number,
  toleranceSeconds = 0.25,
  seekOriginSeconds: number | null = null,
): { accept: boolean; clearPending: boolean } {
  if (pendingSeekSeconds === null) {
    return { accept: true, clearPending: false };
  }
  if (Date.now() > pendingSeekDeadline) {
    return { accept: true, clearPending: true };
  }
  if (Math.abs(positionSeconds - pendingSeekSeconds) <= toleranceSeconds) {
    return { accept: true, clearPending: true };
  }
  const origin = seekOriginSeconds ?? pendingSeekSeconds;
  const forwardSeek = pendingSeekSeconds >= origin - toleranceSeconds;
  if (forwardSeek && positionSeconds >= pendingSeekSeconds - toleranceSeconds) {
    return { accept: true, clearPending: true };
  }
  if (!forwardSeek && positionSeconds <= pendingSeekSeconds + toleranceSeconds) {
    return { accept: true, clearPending: true };
  }
  return { accept: false, clearPending: false };
}

/** Parse Spotify playback_update / playback_started payload fields (milliseconds). */
export function spotifyPlaybackFields(data: Record<string, unknown> | undefined): {
  positionSeconds: number | null;
  durationSeconds: number | null;
  isPaused: boolean | null;
  isBuffering: boolean | null;
} {
  if (!data) {
    return { positionSeconds: null, durationSeconds: null, isPaused: null, isBuffering: null };
  }

  const positionMs = data.position;
  const durationMs = data.duration;

  return {
    positionSeconds:
      typeof positionMs === "number" && Number.isFinite(positionMs) ? positionMs / 1000 : null,
    durationSeconds:
      typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0
        ? durationMs / 1000
        : null,
    isPaused: typeof data.isPaused === "boolean" ? data.isPaused : null,
    isBuffering: typeof data.isBuffering === "boolean" ? data.isBuffering : null,
  };
}
