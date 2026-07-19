import Link from "next/link";
import type { Artist } from "@/types";
import { genreLabels } from "@/content/artists";
import { getSimilarArtists } from "@/content/hubs";
import { getSetsByArtist } from "@/content/sets";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";

/**
 * SEO-focused internal linking + FAQ block appended to artist pages.
 * All links point to verified hub pages; FAQ answers are verified-data derived.
 */
export function ArtistSeoSection({ artist, faqs }: { artist: Artist; faqs: FaqItem[] }) {
  const hasSimilarHub = getSimilarArtists(artist.slug).length >= 2;
  const hasSets = getSetsByArtist(artist.slug).length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="border-t border-border pt-12">
        <h2 className="font-serif text-2xl text-foreground">Explore more</h2>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {hasSimilarHub && (
            <Link
              href={`/artists/similar/${artist.slug}`}
              className="chip-selectable border border-border px-4 py-2 text-muted-light"
            >
              Artists like {artist.name} →
            </Link>
          )}
          {artist.genres.map((g) => (
            <Link
              key={g}
              href={`/artists/genre/${g}`}
              className="chip-selectable border border-border px-4 py-2 text-muted-light"
            >
              {genreLabels[g]} artists →
            </Link>
          ))}
          {hasSets && (
            <Link
              href={`/artists/${artist.slug}#essential-sets`}
              className="chip-selectable border border-border px-4 py-2 text-muted-light"
            >
              {artist.name} sets →
            </Link>
          )}
        </div>
      </section>

      <FaqSection items={faqs} title={`${artist.name} — FAQ`} />
    </div>
  );
}
