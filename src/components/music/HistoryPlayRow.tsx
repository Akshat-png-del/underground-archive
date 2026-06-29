"use client";

import type { PlayHistoryEntry } from "@/types/library";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { playbackItemFromRef } from "@/lib/music/playback";
import { useCardPlayback } from "@/lib/music/use-card-playback";

interface HistoryPlayRowProps {
  entry: PlayHistoryEntry;
  trailing?: React.ReactNode;
  className?: string;
}

export function HistoryPlayRow({ entry, trailing, className = "" }: HistoryPlayRowProps) {
  const item = playbackItemFromRef(entry.type, entry.refId);
  const fallback = {
    type: entry.type,
    refId: entry.refId,
    label: entry.title,
    title: entry.title,
    subtitle: entry.subtitle,
  };
  const { handleCardPointerDown, stopCardPointerDown, active, playing } = useCardPlayback(
    item ?? fallback,
    entry.type,
    entry.refId,
  );

  return (
    <div
      onPointerDown={(e) => {
        if (!item) return;
        handleCardPointerDown(e);
      }}
      className={`flex cursor-pointer touch-manipulation items-center gap-3 border border-border p-3 transition-colors ${
        active ? "border-accent bg-surface" : ""
      } ${className}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${entry.title}` : `Play ${entry.title}`}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden">
        <TrackArtwork coverArt={entry.coverArt} alt="" fill sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
        <p className="truncate text-xs text-muted">{entry.subtitle}</p>
      </div>
      {trailing && <div onPointerDown={stopCardPointerDown}>{trailing}</div>}
    </div>
  );
}
