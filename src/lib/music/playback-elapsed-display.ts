/**
 * Shared elapsed display from snapshot.displayTime — one formatter for all playback UI surfaces.
 */

export function playbackElapsedDisplaySeconds(displayTime: number, duration: number): number {
  const transportDuration = duration > 0 ? duration : 0;
  const transportElapsed = Math.max(0, displayTime);
  const capped =
    transportDuration > 0 ? Math.min(transportElapsed, transportDuration) : transportElapsed;
  return Math.max(0, Math.round(capped));
}

/** Slider position — fractional seconds so the thumb tracks transport without 1s quantization. */
export function playbackSeekSliderSeconds(displayTime: number, duration: number): number {
  const transportDuration = duration > 0 ? duration : 0;
  const transportElapsed = Math.max(0, displayTime);
  const capped =
    transportDuration > 0 ? Math.min(transportElapsed, transportDuration) : transportElapsed;
  return Math.max(0, capped);
}

export function playbackDurationDisplaySeconds(duration: number): number {
  return duration > 0 ? Math.floor(duration) : 0;
}

export function formatPlaybackClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Elapsed + total labels from the same snapshot fields as the bottom player. */
export function formatPlaybackElapsedSubline(displayTime: number, duration: number): string {
  const elapsed = formatPlaybackClock(playbackElapsedDisplaySeconds(displayTime, duration));
  const total = formatPlaybackClock(playbackDurationDisplaySeconds(duration));
  return `${elapsed} · ${total}`;
}
