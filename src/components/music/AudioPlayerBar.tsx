"use client";

import {
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { PlaybackItem } from "@/lib/music/playback";
import {
  retryPlayback,
  playItem,
  togglePlayback,
} from "@/lib/music/playback-actions";
import { registerPlayerShell, playerController } from "@/lib/music/player-controller";
import { usePlaybackStore } from "@/stores/playback-store";
import { usePlaybackExperience } from "@/lib/music/use-playback-experience";
import { PlaybackSeekBar } from "@/components/music/PlaybackSeekBar";
import { PlaybackVolumeControl } from "@/components/music/PlaybackVolumeControl";
import { PlaybackQueuePanel } from "@/components/music/PlaybackQueuePanel";
import { PlayerErrorBoundary } from "@/components/music/PlayerErrorBoundary";
import { SafeImage } from "@/components/ui/SafeImage";
import { useNowPlayingMetadata } from "@/lib/music/use-now-playing-metadata";
import { assertAudioBarNotOnSetWatchPage } from "@/lib/music/playback-domain-lock";

const EXPANDED_BAR_HEIGHT = "5.75rem";
const COLLAPSED_BAR_HEIGHT = "1.25rem";

/** Stop bar chrome from bubbling pointer/click to page-level card handlers. */
function stopBarBubble(e: { stopPropagation: () => void }): void {
  e.stopPropagation();
}

/**
 * Spotify-style persistent bottom player — audio experience only.
 *
 * Preview audio, Spotify tracks, and external audio URLs.
 * Video sets use SetWatchSurface on /sets/[slug].
 */
export function AudioPlayerBar() {
  const shellRef = useRef<HTMLDivElement>(null);
  const current = usePlaybackStore((s) => s.currentTrack);
  const experience = usePlaybackExperience();
  const showBar = experience === "audio" && !!current;
  const [expanded, setExpanded] = useState(true);

  useLayoutEffect(() => {
    registerPlayerShell(expanded && showBar ? shellRef.current : null);
    return () => registerPlayerShell(null);
  }, [expanded, showBar]);

  useLayoutEffect(() => {
    if (showBar) {
      assertAudioBarNotOnSetWatchPage("AudioPlayerBar");
    }
  }, [showBar]);

  useEffect(() => {
    if (showBar) setExpanded(true);
  }, [showBar, current?.refId]);

  useEffect(() => {
    if (!showBar || typeof document === "undefined") {
      document.documentElement.style.removeProperty("--player-bar-height");
      delete document.documentElement.dataset.playerBarCollapsed;
      return;
    }

    const applyBarHeight = () => {
      document.documentElement.style.setProperty(
        "--player-bar-height",
        expanded ? EXPANDED_BAR_HEIGHT : COLLAPSED_BAR_HEIGHT,
      );
      if (expanded) {
        delete document.documentElement.dataset.playerBarCollapsed;
      } else {
        document.documentElement.dataset.playerBarCollapsed = "true";
      }
    };

    applyBarHeight();

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      applyBarHeight();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style", "data-playback-experience"],
    });

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--player-bar-height");
      delete document.documentElement.dataset.playerBarCollapsed;
    };
  }, [showBar, expanded]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !showBar) return;

    const guardPagePointer = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-player-control]")) return;
      event.stopPropagation();
    };

    shell.addEventListener("pointerdown", guardPagePointer, true);
    shell.addEventListener("click", guardPagePointer, true);
    return () => {
      shell.removeEventListener("pointerdown", guardPagePointer, true);
      shell.removeEventListener("click", guardPagePointer, true);
    };
  }, [showBar, expanded]);

  const toggleExpanded = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setExpanded((value) => !value);
  }, []);

  if (!showBar || !current) {
    return null;
  }

  return (
    <div
      ref={shellRef}
      data-player-shell
      data-audio-player
      data-spotify-player
      data-player-expanded={expanded ? "true" : "false"}
      role="region"
      aria-label="Audio player"
      className="spotify-player-bar spotify-player-bar--audio-mode pointer-events-auto isolate bg-surface"
      onPointerDown={stopBarBubble}
      onClick={stopBarBubble}
    >
      <button
        type="button"
        data-player-control
        className="spotify-player-toggle flex w-full items-center justify-center border-t border-border bg-surface py-1 text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        onClick={toggleExpanded}
        onPointerDown={stopBarBubble}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse player" : "Expand player"}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronUp className="h-4 w-4" aria-hidden />
        )}
      </button>

      <div
        className={`spotify-player-bar-body overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          expanded ? "max-h-[20rem] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!expanded}
      >
        <PlayerErrorBoundary>
          <AudioPlayerBarChrome current={current} />
        </PlayerErrorBoundary>
      </div>
    </div>
  );
}

function AudioPlayerBarChrome({ current }: { current: PlaybackItem }) {
  const isLoading = usePlaybackStore((s) => s.isLoading);
  const error = usePlaybackStore((s) => s.error);
  const meta = useNowPlayingMetadata(current);

  return (
    <div
      className="spotify-player-bar-inner border-t border-border bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      onPointerDown={stopBarBubble}
      onClick={stopBarBubble}
    >
      <div className="spotify-player-seek px-4 pt-1 sm:px-6">
        <PlaybackSeekBar timeFormat="elapsed-total" disabled={!!error} className="w-full" />
      </div>

      <div
        className="spotify-player-row flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-2 sm:gap-5 sm:px-6 sm:py-2.5"
        aria-busy={isLoading}
        onPointerDown={stopBarBubble}
        onClick={stopBarBubble}
      >
        <div className="spotify-player-meta flex min-w-0 flex-1 items-center gap-3">
          <div className="player-artwork pointer-events-none relative h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-background sm:h-14 sm:w-14">
            {current.coverArt && (
              <SafeImage
                src={current.coverArt}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            )}
          </div>
          <div className="pointer-events-none min-w-0 flex-1 select-none">
            <p className="truncate text-sm font-medium text-foreground sm:text-base">
              {meta?.primary ?? current.title}
            </p>
            <p className="truncate text-xs text-muted sm:text-sm">
              {error ? "Playback error" : isLoading ? "Loading…" : (meta?.secondary ?? current.subtitle)}
            </p>
          </div>
        </div>

        <AudioTransportControls isLoading={isLoading} />
      </div>

      <div
        className="spotify-player-mobile-actions flex items-center justify-end gap-1 border-t border-border/60 px-4 py-1.5 sm:hidden"
        onPointerDown={stopBarBubble}
        onClick={stopBarBubble}
      >
        <PlaybackQueuePanel />
        <PlaybackVolumeControl />
      </div>

      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 sm:px-6" role="alert">
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            data-player-control
            className="player-control-btn mt-1 text-sm text-accent underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              retryPlayback();
            }}
          >
            Retry playback
          </button>
        </div>
      )}
    </div>
  );
}

function AudioTransportControls({ isLoading }: { isLoading: boolean }) {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const queueLength = usePlaybackStore((s) => s.queue.length);
  const queueIndex = usePlaybackStore((s) => s.queueIndex);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const canGoPrevious = queueIndex > 0 || currentTime > 3;
  const canGoNext = queueIndex < queueLength - 1;

  const handlePrevious = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const store = usePlaybackStore.getState();
    if (store.currentTime > 3) {
      playerController.seek(0);
      return;
    }
    const prevIndex = store.queueIndex - 1;
    if (prevIndex < 0) return;
    const prevItem = store.queue[prevIndex];
    if (!prevItem) return;
    playItem(prevItem, { browse: { queue: store.queue, queueIndex: prevIndex } });
  }, []);

  const handleNext = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const store = usePlaybackStore.getState();
    const nextIndex = store.queueIndex + 1;
    if (nextIndex >= store.queue.length) return;
    const nextItem = store.queue[nextIndex];
    if (!nextItem) return;
    playItem(nextItem, { browse: { queue: store.queue, queueIndex: nextIndex } });
  }, []);

  const handleSkipBack = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading) return;
      const store = usePlaybackStore.getState();
      const max = store.duration > 0 ? store.duration : store.currentTime + 10;
      playerController.seek(Math.max(0, Math.min(store.currentTime - 10, max)));
    },
    [isLoading],
  );

  const handleSkipForward = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading) return;
      const store = usePlaybackStore.getState();
      const max = store.duration > 0 ? store.duration : store.currentTime + 10;
      playerController.seek(Math.min(store.currentTime + 10, max));
    },
    [isLoading],
  );

  const handlePlayPause = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    togglePlayback();
  }, []);

  return (
    <>
      <div
        data-player-control
        className="spotify-player-transport flex shrink-0 items-center justify-center gap-1 sm:gap-2"
        onPointerDown={stopBarBubble}
        onClick={stopBarBubble}
      >
        <TransportButton
          label="Previous"
          disabled={!canGoPrevious}
          onClick={handlePrevious}
          className="h-9 w-9 sm:h-10 sm:w-10"
        >
          <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
        </TransportButton>
        <TransportButton
          label="Rewind 10 seconds"
          disabled={isLoading}
          onClick={handleSkipBack}
          className="hidden h-9 w-9 sm:flex sm:h-10 sm:w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </TransportButton>
        <TransportButton
          label={isPlaying ? "Pause" : "Play"}
          variant="primary"
          disabled={isLoading}
          onClick={handlePlayPause}
          className="h-10 w-10 sm:h-11 sm:w-11"
        >
          {isLoading && !isPlaying ? (
            <span className="inline-block h-5 w-5 animate-pulse rounded-full bg-background/70" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </TransportButton>
        <TransportButton
          label="Fast forward 10 seconds"
          disabled={isLoading}
          onClick={handleSkipForward}
          className="hidden h-9 w-9 sm:flex sm:h-10 sm:w-10"
        >
          <RotateCw className="h-4 w-4" />
        </TransportButton>
        <TransportButton
          label="Next"
          disabled={!canGoNext}
          onClick={handleNext}
          className="h-9 w-9 sm:h-10 sm:w-10"
        >
          <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
        </TransportButton>
      </div>

      <div
        className="spotify-player-actions hidden min-w-0 flex-1 items-center justify-end gap-1 sm:flex"
        onPointerDown={stopBarBubble}
        onClick={stopBarBubble}
      >
        <PlaybackQueuePanel />
        <PlaybackVolumeControl />
      </div>
    </>
  );
}

function TransportButton({
  children,
  label,
  onClick,
  disabled,
  variant = "ghost",
  className = "h-10 w-10",
}: {
  children: ReactNode;
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: "ghost" | "primary";
  className?: string;
}) {
  return (
    <button
      type="button"
      data-player-control
      disabled={disabled}
      aria-label={label}
      className={`player-control-btn flex shrink-0 items-center justify-center rounded-full transition-all ${
        variant === "primary"
          ? "bg-accent text-background hover:brightness-110"
          : "text-foreground hover:bg-surface-elevated hover:text-accent disabled:opacity-40"
      } ${className}`}
      onClick={onClick}
      onPointerDown={stopBarBubble}
    >
      {children}
    </button>
  );
}
