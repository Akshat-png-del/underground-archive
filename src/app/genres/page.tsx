import type { Metadata } from "next";
import Link from "next/link";
import { genreLabels, genreDescriptions, getArtistsByGenre } from "@/content/artists";
import { buildMetadata } from "@/lib/seo/metadata";
import { ArtistCard } from "@/components/artists/ArtistCard";

export const metadata: Metadata = buildMetadata({
  title: "Genres",
  description: "Explore underground electronic music by genre — hard techno, schranz, EBM, darkwave, and more.",
  path: "/genres",
});

const genres = Object.keys(genreLabels);

export default function GenresPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Genres</h1>
      <p className="mt-3 text-muted-light">Browse the archive by sound.</p>

      <div className="mt-10 space-y-8">
        {genres.map((slug) => {
          const count = getArtistsByGenre(slug).length;
          if (count === 0) return null;
          return (
            <Link
              key={slug}
              href={`/genres/${slug}`}
              className="block border border-border p-6 transition-colors hover:border-accent/50"
            >
              <h2 className="font-serif text-2xl text-foreground">{genreLabels[slug]}</h2>
              <p className="mt-2 text-sm text-muted-light">{genreDescriptions[slug]}</p>
              <p className="mt-3 text-xs text-muted">{count} artists</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
