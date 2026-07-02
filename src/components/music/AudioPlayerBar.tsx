"use client";

import {
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
  useEffect,
  type MouseEvent,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PlaybackItem } from "@/lib/music/playback";
import { registerPlayerShell } from "@/lib/music/player-controller";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { usePlaybackExperience } from "@/lib/music/use-playback-experience";
import { PlaybackSeekBar } from "@/components/music/PlaybackSeekBar";
import { PlayerErrorBoundary } from "@/components/music/PlayerErrorBoundary";
import { SafeImage } from "@/components/ui/SafeImage";
import { useNowPlayingMetadata } from "@/lib/music/use-now-playing-metadata";
import { assertAudioBarNotOnSetWatchPage } from "@/lib/music/playback-domain-lock";

const EXPANDED_BAR_HEIGHT = "6.75rem";
const COLLAPSED_BAR_HEIGHT = "1.25rem";

export function AudioPlayerBar() {
  const shellRef = useRef<HTMLDivElement>(null);
  const snapshot = useFinalPlaybackSnapshot();
  const current = snapshot.activeTrack;
  const experience = usePlaybackExperience();
  const showBar = experience === "audio" && !!current;
  const [expanded, setExpanded] = useState(true);

  useLayoutEffect(() => {
    registerPlayerShell(expanded && showBar ? shellRef.current : null);
    return () => registerPlayerShell(null);
  }, [expanded, showBar]);

  useLayoutEffect(() => {
    if (showBar) assertAudioBarNotOnSetWatchPage("AudioPlayerBar");
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
      if (expanded) delete document.documentElement.dataset.playerBarCollapsed;
      else document.documentElement.dataset.playerBarCollapsed = "true";
    };

    applyBarHeight();
    const observer = new MutationObserver(applyBarHeight);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-playback-experience"],
    });

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--player-bar-height");
      delete document.documentElement.dataset.playerBarCollapsed;
    };
  }, [showBar, expanded]);

  const toggleExpanded = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  if (!showBar || !current) return null;

  return (
    <div
      ref={shellRef}
      data-player-shell
      data-audio-player
      data-spotify-player
      data-player-expanded={expanded ? "true" : "false"}
      role="region"
      aria-label="Audio player"
      className="spotify-player-bar spotify-player-bar--audio-mode bg-surface"
      style={{ minHeight: expanded ? EXPANDED_BAR_HEIGHT : COLLAPSED_BAR_HEIGHT }}
    >
      <button
        type="button"
        data-player-control
        className="spotify-player-toggle flex w-full items-center justify-center border-t border-border bg-surface py-1 text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse player" : "Expand player"}
      >
        {expanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
      </button>

      <div
        className={`spotify-player-bar-body overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          expanded ? "max-h-[24rem] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!expanded}
      >
        <PlayerErrorBoundary>
          <AudioPlayerBarChrome current={current} snapshot={snapshot} />
        </PlayerErrorBoundary>
      </div>
    </div>
  );
}

function AudioPlayerBarChrome({
  current,
  snapshot,
}: {
  current: PlaybackItem;
  snapshot: ReturnType<typeof useFinalPlaybackSnapshot>;
}) {
  const { error, isBuffering } = snapshot;
  const meta = useNowPlayingMetadata(current);
  const artistLine = error
    ? "Playback error"
    : isBuffering
      ? "Buffering…"
      : (meta?.secondary ?? current.subtitle);

  return (
    <div className="spotify-player-bar-inner border-t border-border bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
      <div className="spotify-bar">
        <div className="sb-left spotify-player-meta spotify-player-chrome">
          <div className="sb-artwork player-artwork relative overflow-hidden">
            {current.coverArt && (
              <SafeImage src={current.coverArt} alt="" fill sizes="56px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="sb-title truncate">{meta?.primary ?? current.title}</p>
            <p className="sb-artist truncate">{artistLine || "\u00a0"}</p>
          </div>
        </div>

        <div className="sb-center spotify-player-center spotify-player-interactive">
          <AudioTransportControls snapshot={snapshot} />
          <PlaybackSeekBar
            key={snapshot.activeTrack?.refId ?? "none"}
            variant="spotify-bar"
            className="w-full"
          />
        </div>

        <div className="sb-right" aria-hidden />
      </div>

      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 sm:px-6" role="alert">
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            data-player-control
            className="sb-btn mt-1 text-sm text-accent underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              mediaSessionController.retry();
            }}
          >
            Retry playback
          </button>
        </div>
      )}
    </div>
  );
}

function AudioTransportControls({
  snapshot,
}: {
  snapshot: ReturnType<typeof useFinalPlaybackSnapshot>;
}) {
  const { isPlaying, queue, queueIndex, currentTime } = snapshot;
  const queueLength = queue.length;
  const canGoPrevious = queueIndex > 0 || currentTime > 3;
  const canGoNext = queueIndex < queueLength - 1;

  const handlePrevious = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    mediaSessionController.prev();
  }, []);

  const handleNext = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    mediaSessionController.next();
  }, []);

  const handlePlayPause = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    mediaSessionController.togglePlayPause();
  }, []);

  return (
    <div className="sb-controls spotify-player-transport">
      <button
        type="button"
        data-player-control
        className={`sb-btn${canGoPrevious ? "" : " sb-btn--muted"}`}
        onClick={handlePrevious}
        aria-label="Previous"
        aria-disabled={!canGoPrevious || undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 6v12h2V6H6zm3.5 6l8.5 6V6l-8.5 6z" />
        </svg>
      </button>

      <button
        type="button"
        data-player-control
        data-player-play-pause="true"
        className={`sb-btn sb-play${isPlaying ? " hidden" : ""}`}
        onClick={handlePlayPause}
        aria-label="Play"
        aria-hidden={isPlaying}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <button
        type="button"
        data-player-control
        data-player-play-pause="true"
        className={`sb-btn sb-pause${isPlaying ? "" : " hidden"}`}
        onClick={handlePlayPause}
        aria-label="Pause"
        aria-hidden={!isPlaying}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
        </svg>
      </button>

      <button
        type="button"
        data-player-control
        className={`sb-btn${canGoNext ? "" : " sb-btn--muted"}`}
        onClick={handleNext}
        aria-label="Next"
        aria-disabled={!canGoNext || undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 6v12l8.5-6L6 6zm9 0v12h2V6h-2z" />
        </svg>
      </button>
    </div>
  );
}
