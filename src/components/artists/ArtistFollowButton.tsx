"use client";

import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";

export function ArtistFollowButton({ slug }: { slug: string }) {
  const { isArtistFollowed, toggleFollowArtist } = useLibrary();
  const following = isArtistFollowed(slug);

  return (
    <Button
      variant={following ? "outline" : "primary"}
      size="sm"
      onClick={() => toggleFollowArtist(slug)}
    >
      {following ? "Following" : "Follow artist"}
    </Button>
  );
}
