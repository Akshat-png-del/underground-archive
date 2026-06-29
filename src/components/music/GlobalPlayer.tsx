"use client";

import Link from "next/link";
import { Pause, Play, X, Maximize2 } from "lucide-react";
import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { PlayerModal } from "@/components/music/PlayerModal";

export function GlobalPlayer() {
  const current = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isLoading = usePlaybackStore((s) => s.isLoading);
  const detailsOpen = usePlaybackStore((s) => s.detailsOpen);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const stop = usePlaybackStore((s) => s.stop);
  const openDetails = usePlaybackStore((s) => s.openDetails);
  const closeDetails = usePlaybackStore((s) => s.closeDetails);

  useEffect(() => {
    if (!current) {
      document.body.style.paddingBottom = "";
      return;
    }
    document.body.style.paddingBottom = "5.25rem";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [current]);

  if (!current) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
        role="region"
        aria-label="Now playing"
        aria-busy={isLoading}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4">
          {current.coverArt ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-border">
              <SafeImage src={current.coverArt} alt="" fill sizes="48px" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-background text-xs text-muted">
              ▶
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{current.title}</p>
            <p className="truncate text-xs text-muted">
              {isLoading ? "Loading…" : current.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-accent/60" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={openDetails}
              aria-label="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {current.detailsHref && (
              <Link
                href={current.detailsHref}
                className="hidden text-xs text-accent underline-offset-4 transition-colors hover:underline sm:inline"
              >
                Full page
              </Link>
            )}
            <Button size="sm" variant="ghost" onClick={stop} aria-label="Close player">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {detailsOpen && (
        <PlayerModal
          title={current.title}
          subtitle={current.subtitle}
          coverArt={current.coverArt}
          youtubeId={current.youtubeId}
          youtubeUrl={current.youtubeUrl}
          detailsHref={current.detailsHref}
          spotifyUrl={current.spotifyUrl}
          onClose={closeDetails}
        />
      )}
    </>
  );
}
