"use client";

import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";

export function ArtistSaveButton({ slug }: { slug: string }) {
  const { toggleSaveArtist, isArtistSaved } = useLibrary();
  const saved = isArtistSaved(slug);

  return (
    <Button size="sm" variant="outline" onClick={() => toggleSaveArtist(slug)}>
      {saved ? "Saved" : "Save artist"}
    </Button>
  );
}
