"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import type { CatalogTrack } from "@/types/library";
import { MusicActions } from "@/components/music/MusicActions";
import { trackId } from "@/lib/music";

interface TrackRowProps {
  track: CatalogTrack;
  index?: number;
}

export function TrackRow({ track, index }: TrackRowProps) {
  const id = track.id || trackId(track.artistSlug, track.title);

  return (
    <div className="flex items-center gap-4 border border-border p-3">
      {index !== undefined && <span className="w-6 text-sm text-muted">{index + 1}</span>}
      <div className="relative h-12 w-12 shrink-0">
        <SafeImage src={track.coverArt} alt="" fill sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground truncate">{track.title}</p>
        <Link href={`/artists/${track.artistSlug}`} className="text-xs text-muted hover:text-accent">
          {track.artist} · {track.releaseYear} · {track.duration}
        </Link>
      </div>
      <MusicActions
        type="track"
        refId={id}
        label={`${track.title} — ${track.artist}`}
        spotifyUrl={track.spotifyUrl}
        youtubeUrl={track.youtubeUrl}
        compact
      />
    </div>
  );
}
