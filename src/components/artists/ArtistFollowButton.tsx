"use client";

import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";

export function ArtistFollowButton({ slug }: { slug: string }) {
  const { isArtistFollowed, toggleFollowArtist } = useLibrary();
  const requireAuth = useRequireLibraryAuth();
  const following = isArtistFollowed(slug);

  return (
    <Button
      variant={following ? "outline" : "primary"}
      size="sm"
      onClick={() => {
        if (!requireAuth()) return;
        toggleFollowArtist(slug);
      }}
    >
      {following ? "Following" : "Follow artist"}
    </Button>
  );
}
