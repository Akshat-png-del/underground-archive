import type { Artist } from "@/types";
import { ArtistCard } from "./ArtistCard";

interface ArtistGridProps {
  artists: Artist[];
}

export function ArtistGrid({ artists }: ArtistGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {artists.map((artist) => (
        <ArtistCard
          key={artist.slug}
          slug={artist.slug}
          name={artist.name}
          portrait={artist.portrait}
          genres={artist.genres}
          city={artist.city}
        />
      ))}
    </div>
  );
}
