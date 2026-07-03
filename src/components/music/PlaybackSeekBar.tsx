"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { FinalPlaybackSnapshot } from "@/lib/music/final-playback-snapshot";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import {
  formatPlaybackClock,
  playbackDurationDisplaySeconds,
  playbackElapsedDisplaySeconds,
  playbackSeekSliderSeconds,
} from "@/lib/music/playback-elapsed-display";
import { seekPipelineTrace, seekPipelineTraceBlock } from "@/lib/music/seek-pipeline-trace";

function dragStateSnapshot(
  draggingRef: React.RefObject<boolean>,
  previewRef: React.RefObject<number>,
  pointerIdRef: React.RefObject<number | null>,
  listenerGenRef: React.RefObject<number>,
  snapshot: FinalPlaybackSnapshot,
  sliderValue: number,
) {
  const session = mediaSessionController.getState();
  return {
    dragging: draggingRef.current,
    previewRef: previewRef.current,
    pointerId: pointerIdRef.current,
    listenerGen: listenerGenRef.current,
    isSeeking: session.isSeeking,
    seekPreviewTime: session.seekPreviewTime,
    hoverPreviewTime: session.hoverPreviewTime,
    displayTime: snapshot.displayTime,
    sliderValue,
    controllerCurrentTime: session.currentTime,
    duration: snapshot.duration,
    canSeek: snapshot.duration > 0,
  };
}

interface PlaybackSeekBarProps {
  snapshot: FinalPlaybackSnapshot;
  className?: string;
  showTimes?: boolean;
  timeFormat?: "split" | "elapsed-total";
  disabled?: boolean;
  variant?: "default" | "overlay" | "spotify-bar";
}

export function PlaybackSeekBar({
  snapshot,
  className = "",
  showTimes = false,
  timeFormat = "split",
  variant = "default",
}: PlaybackSeekBarProps) {
  const { displayTime, duration, activeTrack } = snapshot;
  const trackKey = activeTrack?.refId ?? "none";

  const draggingRef = useRef(false);
  const previewRef = useRef(0);
  const pointerEndCleanupRef = useRef<(() => void) | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const listenerGenRef = useRef(0);
  const seekInputRef = useRef<HTMLInputElement | null>(null);

  const [, forceRender] = useState(0);
  const transportDuration = duration > 0 ? duration : 0;
  const durationLabel = playbackDurationDisplaySeconds(transportDuration);
  const elapsedDisplaySeconds = playbackElapsedDisplaySeconds(displayTime, transportDuration);
  const seekSliderSeconds = playbackSeekSliderSeconds(displayTime, transportDuration);
  const max = transportDuration > 0 ? transportDuration : 1;
  const canSeek = transportDuration > 0;
  const sliderValue = draggingRef.current
    ? previewRef.current
    : Math.min(seekSliderSeconds, max);

  const clearPointerEndListeners = useCallback(() => {
    seekPipelineTrace("PlaybackSeekBar.clearPointerEndListeners", "ENTER", {
      hadCleanup: !!pointerEndCleanupRef.current,
      listenerGen: listenerGenRef.current,
    });
    pointerEndCleanupRef.current?.();
    pointerEndCleanupRef.current = null;
    seekPipelineTrace("PlaybackSeekBar.clearPointerEndListeners", "EXIT", {
      listenerGen: listenerGenRef.current,
    });
  }, []);

  const commitDragSeek = useCallback(() => {
    seekPipelineTrace("PlaybackSeekBar.commitDragSeek", "ENTER", {
      ...dragStateSnapshot(draggingRef, previewRef, pointerIdRef, listenerGenRef, snapshot, sliderValue),
    });
    if (!draggingRef.current) {
      seekPipelineTrace("PlaybackSeekBar.commitDragSeek", "EARLY_RETURN", {
        reason: "draggingRef.current === false",
        ...dragStateSnapshot(draggingRef, previewRef, pointerIdRef, listenerGenRef, snapshot, sliderValue),
      });
      return;
    }
    draggingRef.current = false;
    clearPointerEndListeners();
    const target = previewRef.current;
    seekPipelineTrace("PlaybackSeekBar.commitDragSeek", "INVOKE", {
      next: "mediaSessionController.commitSeek",
      target,
      ...dragStateSnapshot(draggingRef, previewRef, pointerIdRef, listenerGenRef, snapshot, sliderValue),
    });
    mediaSessionController.commitSeek(target);
    seekPipelineTrace("PlaybackSeekBar.commitDragSeek", "EXIT", {
      target,
      dragging: draggingRef.current,
    });
  }, [clearPointerEndListeners, snapshot, sliderValue]);

  const attachPointerEndListeners = useCallback(() => {
    seekPipelineTrace("PlaybackSeekBar.attachPointerEndListeners", "ENTER", {
      listenerGenBefore: listenerGenRef.current,
    });
    clearPointerEndListeners();
    const gen = listenerGenRef.current + 1;
    listenerGenRef.current = gen;
    const onPointerEnd = (ev: Event) => {
      seekPipelineTraceBlock("PlaybackSeekBar.windowPointerEnd", {
        listenerGen: gen,
        eventType: ev.type,
        isTrusted: (ev as PointerEvent).isTrusted,
        pointerId: (ev as PointerEvent).pointerId ?? null,
        target: (ev.target as HTMLElement | null)?.tagName ?? null,
        ...dragStateSnapshot(draggingRef, previewRef, pointerIdRef, listenerGenRef, snapshot, sliderValue),
      });
      seekPipelineTrace("PlaybackSeekBar.onPointerEnd", "INVOKE", {
        next: "commitDragSeek",
        eventType: ev.type,
        listenerGen: gen,
      });
      commitDragSeek();
    };
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    seekPipelineTrace("PlaybackSeekBar.attachPointerEndListeners", "STATE", {
      attached: ["window.pointerup", "window.pointercancel"],
      listenerGen: gen,
    });
    pointerEndCleanupRef.current = () => {
      seekPipelineTrace("PlaybackSeekBar.detachPointerEndListeners", "ENTER", { listenerGen: gen });
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      seekPipelineTrace("PlaybackSeekBar.detachPointerEndListeners", "EXIT", { listenerGen: gen });
    };
    seekPipelineTrace("PlaybackSeekBar.attachPointerEndListeners", "EXIT", { listenerGen: gen });
  }, [clearPointerEndListeners, commitDragSeek, snapshot, sliderValue]);

  const handlePointerDown = (e: PointerEvent<HTMLInputElement>) => {
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "ENTER", {
      eventType: "react.pointerdown",
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      button: e.button,
      buttons: e.buttons,
      defaultPrevented: e.defaultPrevented,
      value: Number(e.currentTarget.value),
      canSeek,
      ...dragStateSnapshot(draggingRef, previewRef, pointerIdRef, listenerGenRef, snapshot, sliderValue),
    });
    e.stopPropagation();
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "BRANCH", {
      action: "stopPropagation",
      defaultPrevented: e.defaultPrevented,
    });
    if (!canSeek) {
      seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "EARLY_RETURN", {
        reason: "canSeek === false",
        durationLabel,
        transportDuration,
      });
      return;
    }
    const initial = Number(e.currentTarget.value);
    draggingRef.current = true;
    previewRef.current = initial;
    pointerIdRef.current = e.pointerId;
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "STATE", {
      dragging: true,
      previewRef: initial,
      pointerId: e.pointerId,
    });
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "INVOKE", {
      next: "mediaSessionController.beginSeek",
      initial,
    });
    mediaSessionController.beginSeek(initial);
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "INVOKE", {
      next: "attachPointerEndListeners",
    });
    attachPointerEndListeners();
    seekPipelineTrace("PlaybackSeekBar.handlePointerDown", "EXIT", {
      dragging: draggingRef.current,
      listenerGen: listenerGenRef.current,
    });
  };

  const handlePointerMove = (e: PointerEvent<HTMLInputElement>) => {
    seekPipelineTrace("PlaybackSeekBar.handlePointerMove", "ENTER", {
      eventType: "react.pointermove",
      pointerId: e.pointerId,
      value: Number(e.currentTarget.value),
      dragging: draggingRef.current,
    });
    if (!canSeek || !draggingRef.current) {
      seekPipelineTrace("PlaybackSeekBar.handlePointerMove", "EARLY_RETURN", {
        reason: !canSeek ? "canSeek === false" : "draggingRef.current === false",
        canSeek,
        dragging: draggingRef.current,
      });
      return;
    }
    const next = Number(e.currentTarget.value);
    previewRef.current = next;
    seekPipelineTrace("PlaybackSeekBar.handlePointerMove", "INVOKE", {
      next: "mediaSessionController.updateSeek",
      next_value: next,
    });
    mediaSessionController.updateSeek(next);
    forceRender((x) => x + 1);
    seekPipelineTrace("PlaybackSeekBar.handlePointerMove", "EXIT", { previewRef: next });
  };

  const handlePreviewMove = (e: ChangeEvent<HTMLInputElement>) => {
    seekPipelineTrace("PlaybackSeekBar.handlePreviewMove", "ENTER", {
      eventType: e.type === "input" ? "react.input" : "react.change",
      value: Number(e.target.value),
      dragging: draggingRef.current,
    });
    e.stopPropagation();
    if (!canSeek || !draggingRef.current) {
      seekPipelineTrace("PlaybackSeekBar.handlePreviewMove", "EARLY_RETURN", {
        reason: !canSeek ? "canSeek === false" : "draggingRef.current === false",
        canSeek,
        dragging: draggingRef.current,
      });
      return;
    }
    const next = Number(e.target.value);
    previewRef.current = next;
    seekPipelineTrace("PlaybackSeekBar.handlePreviewMove", "INVOKE", {
      next: "mediaSessionController.updateSeek",
      next_value: next,
    });
    mediaSessionController.updateSeek(next);
    forceRender((x) => x + 1);
    seekPipelineTrace("PlaybackSeekBar.handlePreviewMove", "EXIT", { previewRef: next });
  };

  useEffect(() => {
    const el = seekInputRef.current;
    if (!el) return;

    const logNative = (eventType: string) => (ev: Event) => {
      const pe = ev as PointerEvent;
      const me = ev as MouseEvent;
      seekPipelineTrace("PlaybackSeekBar.nativeEvent", "NATIVE", {
        eventType,
        isTrusted: ev.isTrusted,
        pointerId: pe.pointerId ?? null,
        pointerType: pe.pointerType ?? null,
        button: me.button ?? null,
        buttons: me.buttons ?? null,
        defaultPrevented: ev.defaultPrevented,
        cancelBubble: ev.cancelBubble,
        eventPhase: ev.eventPhase,
        target: (ev.target as HTMLElement | null)?.tagName ?? null,
        currentTarget: (ev.currentTarget as HTMLElement | null)?.tagName ?? null,
        value: (el as HTMLInputElement).value,
        dragging: draggingRef.current,
        previewRef: previewRef.current,
      });
    };

    const types = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "mouseup",
      "touchend",
      "click",
      "input",
      "change",
    ] as const;

    const handlers = types.map((type) => {
      const handler = logNative(`native.${type}`);
      el.addEventListener(type, handler, { passive: true });
      return { type, handler };
    });

    seekPipelineTrace("PlaybackSeekBar.useEffect", "STATE", {
      action: "native listeners attached",
      types: [...types],
    });

    return () => {
      for (const { type, handler } of handlers) {
        el.removeEventListener(type, handler);
      }
      seekPipelineTrace("PlaybackSeekBar.useEffect", "STATE", {
        action: "native listeners detached",
      });
    };
  }, [trackKey]);

  const seekInputClass =
    variant === "spotify-bar"
      ? "sb-slider"
      : variant === "overlay"
        ? "theater-seek player-seek relative z-10 h-2 w-full min-w-0 cursor-pointer accent-emerald-500"
        : "player-seek relative z-10 h-2 w-full min-w-0 cursor-pointer accent-accent";

  const seekInput = (
    <input
      ref={seekInputRef}
      key={trackKey}
      type="range"
      data-player-control
      min={0}
      max={max}
      step={0.1}
      value={sliderValue}
      disabled={!canSeek}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={durationLabel}
      aria-valuenow={sliderValue}
      className={seekInputClass}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onInput={handlePreviewMove}
      onChange={handlePreviewMove}
      onClick={(e) => {
        seekPipelineTrace("PlaybackSeekBar.handleClick", "ENTER", {
          eventType: "react.click",
          defaultPrevented: e.defaultPrevented,
        });
        e.stopPropagation();
        seekPipelineTrace("PlaybackSeekBar.handleClick", "EXIT");
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!canSeek) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          mediaSessionController.commitSeek(sliderValue + step);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          mediaSessionController.commitSeek(sliderValue - step);
        }
      }}
    />
  );

  if (variant === "spotify-bar") {
    return (
      <div data-player-control className={`sb-seek spotify-player-interactive ${className}`.trim()}>
        <span className="sb-time">{formatPlaybackClock(elapsedDisplaySeconds)}</span>
        {seekInput}
        <span className="sb-time">{formatPlaybackClock(durationLabel)}</span>
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
        {formatPlaybackClock(elapsedDisplaySeconds)} / {formatPlaybackClock(durationLabel)}
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
            {formatPlaybackClock(elapsedDisplaySeconds)}
          </span>
        )}
        {seekInput}
        {showTimes && timeFormat === "split" && (
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums text-muted"
            aria-label="Total duration"
          >
            {formatPlaybackClock(durationLabel)}
          </span>
        )}
      </div>
    </div>
  );
}
