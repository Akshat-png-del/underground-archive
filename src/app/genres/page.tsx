import type { Metadata } from "next";
import Link from "next/link";
import { genreLabels, genreDescriptions, getArtistsByGenre } from "@/content/artists";
import { buildMetadata } from "@/lib/seo/metadata";

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
      <p className="mt-3 text-muted-light">
        Browse the archive by sound. Each genre links to its essential artists, verified sets, and
        related reading in the{" "}
        <Link href="/editorial" className="text-accent hover:underline">
          Cultural Knowledge
        </Link>{" "}
        archive.
      </p>

      <div className="mt-10 space-y-8">
        {genres.map((slug) => {
          const count = getArtistsByGenre(slug).length;
          if (count === 0) return null;
          return (
            <div key={slug} className="border border-border p-6">
              <Link href={`/genres/${slug}`} className="group block">
                <h2 className="font-serif text-2xl text-foreground group-hover:text-accent">
                  {genreLabels[slug]}
                </h2>
                <p className="mt-2 text-sm text-muted-light">{genreDescriptions[slug]}</p>
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="text-muted">{count} artists</span>
                <Link href={`/genres/${slug}`} className="text-accent hover:underline">
                  Explore →
                </Link>
                <Link href={`/artists/genre/${slug}`} className="text-accent hover:underline">
                  Artists →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
