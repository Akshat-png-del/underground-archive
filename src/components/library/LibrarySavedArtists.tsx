"use client";

import { useMemo } from "react";
import { getArtist } from "@/content/artists";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { useLibrary } from "@/context/LibraryContext";

export function LibrarySavedArtists() {
  const { savedArtists, ready } = useLibrary();
  const artists = useMemo(
    () => savedArtists.map((s) => getArtist(s)).filter((a): a is NonNullable<typeof a> => !!a),
    [savedArtists],
  );

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Saved Artists</h1>
      <p className="mt-2 text-muted-light">{artists.length} saved</p>
      {!ready ? (
        <p className="mt-10 text-sm text-muted" role="status">Loading saved artists…</p>
      ) : artists.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-border px-6 py-10 text-center">
          <p className="text-foreground">No saved artists yet</p>
          <p className="mt-1 text-sm text-muted">Save artists from their profile pages to keep them here.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {artists.map((a) => (
            <ArtistCard key={a.slug} artist={a} />
          ))}
        </div>
      )}
    </div>
  );
}
