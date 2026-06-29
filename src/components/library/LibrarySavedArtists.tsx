"use client";

import { getArtist } from "@/content/artists";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { useLibrary } from "@/context/LibraryContext";

export function LibrarySavedArtists() {
  const { savedArtists } = useLibrary();
  const artists = savedArtists.map((s) => getArtist(s)).filter(Boolean);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Saved Artists</h1>
      <p className="mt-2 text-muted-light">{artists.length} saved</p>
      {artists.length === 0 ? (
        <p className="mt-12 text-muted">Save artists from their profile pages.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {artists.map((a) => a && (
            <ArtistCard key={a.slug} artist={a} />
          ))}
        </div>
      )}
    </div>
  );
}
