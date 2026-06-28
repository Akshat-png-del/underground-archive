import type { Metadata } from "next";
import { artists } from "@/content/artists";
import { buildMetadata } from "@/lib/seo/metadata";
import { ArtistGrid } from "@/components/artists/ArtistGrid";

export const metadata: Metadata = buildMetadata({
  title: "Artists",
  description: "Underground electronic music artists — hard techno, schranz, EBM, darkwave, and industrial techno.",
  path: "/artists",
});

export default function ArtistsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Artists</h1>
      <p className="mt-3 text-muted-light">
        {artists.length} artist profiles — hard techno, schranz, EBM, darkwave, and industrial techno.
      </p>
      <div className="mt-10">
        <ArtistGrid artists={artists} />
      </div>
    </div>
  );
}
