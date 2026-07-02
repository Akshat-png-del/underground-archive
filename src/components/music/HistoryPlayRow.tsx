"use client";

import type { PlayHistoryEntry } from "@/types/library";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { playbackItemFromRef, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import {
  useCardPlayback,
  playbackItemActive,
  playbackItemPlaying,
} from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { resolveSetWatchSlug } from "@/lib/sets/set-watch-navigation";

interface HistoryPlayRowProps {
  entry: PlayHistoryEntry;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
  trailing?: React.ReactNode;
  className?: string;
}

export function HistoryPlayRow({
  entry,
  browseQueue,
  browseIndex,
  trailing,
  className = "",
}: HistoryPlayRowProps) {
  const item = playbackItemFromRef(entry.type, entry.refId);
  const fallback = {
    type: entry.type,
    refId: entry.refId,
    label: entry.title,
    title: entry.title,
    subtitle: entry.subtitle,
  };
  const playbackItem = item ?? fallback;
  const browse = browseQueue ? browseContextAt(browseQueue, playbackItem, browseIndex) : undefined;
  const setSlug =
    entry.type === "set" ? resolveSetWatchSlug(entry.refId) ?? undefined : undefined;
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, entry.type, entry.refId);
  const playing = playbackItemPlaying(snapshot, entry.type, entry.refId);
  const { handleCardPointerDown, stopCardPointerDown } = useCardPlayback(
    playbackItem,
    entry.type,
    entry.refId,
    browse,
    setSlug,
  );

  return (
    <div
      onPointerDown={(e) => {
        if (!item) return;
        handleCardPointerDown(e);
      }}
      className={`playable-surface flex cursor-pointer touch-manipulation items-center gap-3 rounded-sm px-3 py-2.5 ${playableSurfaceClass(active, playing)} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${entry.title}` : `Play ${entry.title}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
        <TrackArtwork coverArt={entry.coverArt} alt="" fill sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.subtitle}</p>
        <p className="truncate text-sm text-foreground/90">{entry.title}</p>
      </div>
      {active && <PlayingIndicator playing={playing} compact />}
      {trailing && <div onPointerDown={stopCardPointerDown}>{trailing}</div>}
    </div>
  );
}
