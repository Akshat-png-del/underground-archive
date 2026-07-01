"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { playerController } from "@/lib/music/player-controller";
import { usePlaybackStore } from "@/stores/playback-store";
import { usePlaybackDuration } from "@/lib/music/use-playback-duration";
import { clampPlaybackPosition } from "@/lib/music/audio-transport-sync";
import { seekSecondsFromClientX } from "@/components/music/playback-seek-ui";

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function stopPointerBubble(e: { stopPropagation: () => void }): void {
  e.stopPropagation();
}

interface PlaybackSeekBarProps {
  className?: string;
  showTimes?: boolean;
  timeFormat?: "split" | "elapsed-total";
  disabled?: boolean;
  variant?: "default" | "overlay";
}

export function PlaybackSeekBar({
  className = "",
  showTimes = false,
  timeFormat = "split",
  disabled = false,
  variant = "default",
}: PlaybackSeekBarProps) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const duration = usePlaybackDuration();
  const seekInputRef = useRef<HTMLInputElement>(null);
  const isScrubbingRef = useRef(false);
  const commitLockRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const max = duration > 0 ? duration : 1;
  const transportTime = duration > 0 ? clampPlaybackPosition(currentTime, duration) : 0;
  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : transportTime;
  const sliderValue = displayTime;
  const canSeek = duration > 0 && !disabled;

  const commitSeek = useCallback(
    (next: number) => {
      if (!canSeek || commitLockRef.current) return;
      const target = clampPlaybackPosition(next, duration);
      commitLockRef.current = true;
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      setScrubTime(null);
      playerController.seek(target);
      requestAnimationFrame(() => {
        commitLockRef.current = false;
      });
    },
    [canSeek, duration],
  );

  const updateScrubFromPointer = useCallback(
    (clientX: number) => {
      const input = seekInputRef.current;
      if (!input || !canSeek) return;
      const next = clampPlaybackPosition(seekSecondsFromClientX(input, clientX, duration), duration);
      setScrubTime(next);
    },
    [canSeek, duration],
  );

  const beginScrub = useCallback(
    (clientX: number) => {
      if (!canSeek) return;
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      updateScrubFromPointer(clientX);
    },
    [canSeek, updateScrubFromPointer],
  );

  const endScrub = useCallback(
    (clientX?: number) => {
      if (!isScrubbingRef.current) return;
      const input = seekInputRef.current;
      if (typeof clientX === "number" && input) {
        commitSeek(seekSecondsFromClientX(input, clientX, duration));
        return;
      }
      if (scrubTime !== null) {
        commitSeek(scrubTime);
        return;
      }
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      setScrubTime(null);
    },
    [commitSeek, duration, scrubTime],
  );

  useEffect(() => {
    if (!isScrubbing) return;
    const onDocumentPointerUp = (event: PointerEvent) => {
      endScrub(event.clientX);
    };
    document.addEventListener("pointerup", onDocumentPointerUp);
    document.addEventListener("pointercancel", onDocumentPointerUp);
    return () => {
      document.removeEventListener("pointerup", onDocumentPointerUp);
      document.removeEventListener("pointercancel", onDocumentPointerUp);
    };
  }, [endScrub, isScrubbing]);

  const seekInputClass =
    variant === "overlay"
      ? "theater-seek h-2 w-full min-w-0 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      : "player-seek h-2 w-full min-w-0 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50";

  const seekInput = (
    <input
      ref={seekInputRef}
      type="range"
      min={0}
      max={max}
      step={0.1}
      value={sliderValue}
      disabled={!canSeek}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={sliderValue}
      className={seekInputClass}
      onPointerDown={(e) => {
        stopPointerBubble(e);
        e.currentTarget.setPointerCapture(e.pointerId);
        beginScrub(e.clientX);
      }}
      onPointerMove={(e) => {
        stopPointerBubble(e);
        if (isScrubbingRef.current && e.buttons > 0) {
          updateScrubFromPointer(e.clientX);
        }
      }}
      onPointerUp={(e) => {
        stopPointerBubble(e);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        endScrub(e.clientX);
      }}
      onPointerCancel={(e) => {
        stopPointerBubble(e);
        endScrub(e.clientX);
      }}
      onKeyDown={(e) => {
        stopPointerBubble(e);
        if (!canSeek) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          commitSeek(transportTime + step);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          commitSeek(transportTime - step);
        }
      }}
      onInput={(e) => {
        stopPointerBubble(e);
        const next = Number((e.target as HTMLInputElement).value);
        if (isScrubbingRef.current) {
          setScrubTime(clampPlaybackPosition(next, duration));
        }
      }}
      onChange={(e) => {
        stopPointerBubble(e);
        if (commitLockRef.current || isScrubbingRef.current) return;
        commitSeek(Number(e.target.value));
      }}
      onClick={stopPointerBubble}
    />
  );

  const combinedTimes =
    timeFormat === "elapsed-total" ? (
      <span
        className={`shrink-0 font-mono text-[11px] tabular-nums ${
          variant === "overlay" ? "text-zinc-200" : "text-muted-light"
        }`}
      >
        {formatClock(displayTime)} / {formatClock(duration)}
      </span>
    ) : null;

  if (variant === "overlay") {
    return (
      <div
        data-player-control
        className={`theater-seek-overlay bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent px-3 pb-2.5 pt-8 ${className}`}
        onPointerDown={stopPointerBubble}
        onClick={stopPointerBubble}
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
      className={`flex flex-col gap-2 ${className}`}
      onPointerDown={stopPointerBubble}
      onClick={stopPointerBubble}
    >
      {timeFormat === "elapsed-total" && combinedTimes}
      <div className="flex items-center gap-2">
        {showTimes && timeFormat === "split" && (
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
            {formatClock(displayTime)}
          </span>
        )}
        {seekInput}
        {showTimes && timeFormat === "split" && (
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums text-muted"
            aria-label="Total duration"
          >
            {formatClock(duration)}
          </span>
        )}
      </div>
    </div>
  );
}
