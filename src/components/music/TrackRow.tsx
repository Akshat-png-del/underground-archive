"use client";

import Link from "next/link";
import type { CatalogTrack } from "@/types/library";
import { MusicActions } from "@/components/music/MusicActions";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { getArtist } from "@/content/artists";
import { trackId } from "@/lib/music";
import { playbackItemFromTrack } from "@/lib/music/playback";
import { useCardPlayback } from "@/lib/music/use-card-playback";

interface TrackRowProps {
  track: CatalogTrack;
  index?: number;
}

export function TrackRow({ track, index }: TrackRowProps) {
  const id = track.id || trackId(track.artistSlug, track.title);
  const genres = getArtist(track.artistSlug)?.genres;
  const item = playbackItemFromTrack(track);
  const { handleCardPointerDown, stopCardPointerDown, active, playing } = useCardPlayback(
    item,
    "track",
    id,
  );

  return (
    <div
      id={`track-${id}`}
      onPointerDown={handleCardPointerDown}
      className={`scroll-mt-28 flex cursor-pointer touch-manipulation items-center gap-4 border p-3 transition-colors hover:border-accent/60 ${
        active ? "border-accent bg-surface" : "border-border"
      }`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardPointerDown(e as unknown as React.PointerEvent);
        }
      }}
    >
      {index !== undefined && <span className="w-6 text-sm text-muted">{index + 1}</span>}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-transparent">
        <TrackArtwork coverArt={track.coverArt} genres={genres} alt="" fill sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{track.title}</p>
        <Link
          href={`/artists/${track.artistSlug}`}
          className="text-xs text-muted hover:text-accent"
          onPointerDown={stopCardPointerDown}
        >
          {track.artist} · {track.releaseYear} · {track.duration}
        </Link>
      </div>
      <div onPointerDown={stopCardPointerDown}>
        <MusicActions
          type="track"
          refId={id}
          label={`${track.title} — ${track.artist}`}
          spotifyUrl={track.spotifyUrl}
          youtubeUrl={track.youtubeUrl}
          compact
        />
      </div>
    </div>
  );
}
