"use client";

import Link from "next/link";
import type { CatalogTrack } from "@/types/library";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { getArtist } from "@/content/artists";
import { trackId } from "@/lib/music";
import { playbackItemFromTrack, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import {
  useCardPlayback,
  playbackItemActive,
  playbackItemPlaying,
} from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { formatPlaybackElapsedSubline } from "@/lib/music/playback-elapsed-display";

interface TrackRowProps {
  track: CatalogTrack;
  index?: number;
  browseQueue?: PlaybackItem[];
}

export function TrackRow({ track, index, browseQueue }: TrackRowProps) {
  const id = track.id || trackId(track.artistSlug, track.title);
  const genres = getArtist(track.artistSlug)?.genres;
  const item = playbackItemFromTrack(track);
  const browse = browseQueue ? browseContextAt(browseQueue, item, index) : undefined;
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, "track", id);
  const playing = playbackItemPlaying(snapshot, "track", id);
  const { handleCardPointerDown, handleCardActivate, stopCardPointerDown } = useCardPlayback(
    item,
    "track",
    id,
    browse,
  );

  return (
    <div
      id={`track-${id}`}
      onPointerDown={handleCardPointerDown}
      className={`playable-surface group flex cursor-pointer touch-manipulation items-center gap-4 rounded-sm px-3 py-3 sm:px-4 ${playableSurfaceClass(active, playing)}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
      aria-current={active ? "true" : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardActivate();
        }
      }}
    >
      {index !== undefined && (
        <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{index + 1}</span>
      )}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-background">
        <TrackArtwork coverArt={track.coverArt} genres={genres} alt="" fill sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.artist}</p>
        <p className="truncate text-base text-foreground/90">{track.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {active
            ? formatPlaybackElapsedSubline(snapshot.displayTime, snapshot.duration)
            : `${track.releaseYear} · ${track.duration}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {active && <PlayingIndicator playing={playing} compact />}
        <Link
          href={`/artists/${track.artistSlug}`}
          className="text-[10px] uppercase tracking-wider text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
          onPointerDown={stopCardPointerDown}
        >
          Artist
        </Link>
      </div>
    </div>
  );
}
