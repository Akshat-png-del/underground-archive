"use client";

import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";

export function ArtistSaveButton({ slug }: { slug: string }) {
  const { toggleSaveArtist, isArtistSaved } = useLibrary();
  const requireAuth = useRequireLibraryAuth();
  const saved = isArtistSaved(slug);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (!requireAuth()) return;
        toggleSaveArtist(slug);
      }}
    >
      {saved ? "Saved" : "Save artist"}
    </Button>
  );
}
