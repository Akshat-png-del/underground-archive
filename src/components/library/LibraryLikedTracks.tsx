"use client";

import { useMemo } from "react";
import { getTrack } from "@/content/tracks";
import { useLibrary } from "@/context/LibraryContext";
import { TrackRow } from "@/components/music/TrackRow";
import { playbackItemFromTrack } from "@/lib/music/playback";

export function LibraryLikedTracks() {
  const { likedTracks } = useLibrary();
  const tracks = useMemo(
    () => likedTracks.map((id) => getTrack(id)).filter((t): t is NonNullable<typeof t> => !!t),
    [likedTracks],
  );
  const browseQueue = useMemo(() => tracks.map(playbackItemFromTrack), [tracks]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Liked Tracks</h1>
      <p className="mt-2 text-muted-light">{tracks.length} liked</p>
      {tracks.length === 0 ? (
        <p className="mt-12 text-muted">Like tracks from artist pages.</p>
      ) : (
        <ol className="mt-10 space-y-3">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} browseQueue={browseQueue} />
          ))}
        </ol>
      )}
    </div>
  );
}
