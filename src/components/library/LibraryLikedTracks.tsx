"use client";

import { useMemo } from "react";
import { getTrack } from "@/content/tracks";
import { useLibrary } from "@/context/LibraryContext";
import { TrackRow } from "@/components/music/TrackRow";
import { playbackItemFromTrack } from "@/lib/music/playback";

export function LibraryLikedTracks() {
  const { likedTracks, ready } = useLibrary();
  const tracks = useMemo(
    () => likedTracks.map((id) => getTrack(id)).filter((t): t is NonNullable<typeof t> => !!t),
    [likedTracks],
  );
  const browseQueue = useMemo(() => tracks.map(playbackItemFromTrack), [tracks]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Liked Tracks</h1>
      <p className="mt-2 text-muted-light">{tracks.length} liked</p>
      {!ready ? (
        <p className="mt-10 text-sm text-muted" role="status">Loading liked tracks…</p>
      ) : tracks.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-border px-6 py-10 text-center">
          <p className="text-foreground">No liked tracks yet</p>
          <p className="mt-1 text-sm text-muted">Like tracks from artist pages to keep them here.</p>
        </div>
      ) : (
        <ol className="mt-8 divide-y divide-border/60">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} browseQueue={browseQueue} />
          ))}
        </ol>
      )}
    </div>
  );
}
