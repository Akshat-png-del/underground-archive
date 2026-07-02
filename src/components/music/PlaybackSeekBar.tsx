"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

function formatClock(totalSeconds: number): string {
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

interface PlaybackSeekBarProps {
  className?: string;
  showTimes?: boolean;
  timeFormat?: "split" | "elapsed-total";
  disabled?: boolean;
  variant?: "default" | "overlay" | "spotify-bar";
}

export function PlaybackSeekBar({
  className = "",
  showTimes = false,
  timeFormat = "split",
  variant = "default",
}: PlaybackSeekBarProps) {
  const snapshot = useFinalPlaybackSnapshot();
  const { currentTime, duration, activeTrack, isScrubbing } = snapshot;
  const trackKey = activeTrack?.refId ?? "none";

  const transportDuration = duration > 0 ? duration : 0;
  const transportElapsed = Math.max(0, currentTime);
  const durationLabel = transportDuration > 0 ? Math.floor(transportDuration) : 0;
  const elapsedLabel = Math.floor(
    transportDuration > 0 ? Math.min(transportElapsed, transportDuration) : transportElapsed,
  );
  const max = durationLabel > 0 ? durationLabel : 1;
  const canSeek = durationLabel > 0;
  const sliderValue = isScrubbing
    ? Math.min(transportElapsed, max)
    : elapsedLabel;

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    mediaSessionController.seek(Number(e.target.value));
  };

  const seekInputClass =
    variant === "spotify-bar"
      ? "sb-slider"
      : variant === "overlay"
        ? "theater-seek player-seek relative z-10 h-2 w-full min-w-0 cursor-pointer accent-emerald-500"
        : "player-seek relative z-10 h-2 w-full min-w-0 cursor-pointer accent-accent";

  const seekInput = (
    <input
      key={trackKey}
      type="range"
      data-player-control
      min={0}
      max={max}
      step={1}
      value={sliderValue}
      disabled={!canSeek}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={durationLabel}
      aria-valuenow={sliderValue}
      className={seekInputClass}
      onChange={handleSeek}
      onInput={handleSeek}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!canSeek) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          mediaSessionController.seek(sliderValue + step);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          mediaSessionController.seek(sliderValue - step);
        }
      }}
    />
  );

  if (variant === "spotify-bar") {
    return (
      <div data-player-control className={`sb-seek spotify-player-interactive ${className}`.trim()}>
        <span className="sb-time">{formatClock(elapsedLabel)}</span>
        {seekInput}
        <span className="sb-time">{formatClock(durationLabel)}</span>
      </div>
    );
  }

  const combinedTimes =
    timeFormat === "elapsed-total" ? (
      <span
        className={`shrink-0 font-mono text-[11px] tabular-nums ${
          variant === "overlay" ? "text-zinc-200" : "text-muted-light"
        }`}
      >
        {formatClock(elapsedLabel)} / {formatClock(durationLabel)}
      </span>
    ) : null;

  if (variant === "overlay") {
    return (
      <div
        data-player-control
        className={`spotify-player-interactive theater-seek-overlay relative z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent px-3 pb-2.5 pt-8 ${className}`}
      >
        <div className="flex items-center gap-2">
          {combinedTimes}
          <div className="min-w-0 flex-1">{seekInput}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-player-control
      className={`spotify-player-interactive relative z-10 flex flex-col gap-2 ${className}`}
    >
      {timeFormat === "elapsed-total" && combinedTimes}
      <div className="flex items-center gap-2">
        {showTimes && timeFormat === "split" && (
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
            {formatClock(elapsedLabel)}
          </span>
        )}
        {seekInput}
        {showTimes && timeFormat === "split" && (
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums text-muted"
            aria-label="Total duration"
          >
            {formatClock(durationLabel)}
          </span>
        )}
      </div>
    </div>
  );
}
