import type { Genre } from "@/types";
import type { Artist } from "@/types";
import { artists, genreLabels, getArtist, getArtistsByGenre } from "@/content/artists";

/** Join a list into readable prose: "A, B and C". */
export function toSentenceList(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/* -------------------------------------------------------------------------- */
/* Genre artist hubs                                                          */
/* -------------------------------------------------------------------------- */

/** Genres that have at least one verified artist in the archive. */
export function getGenreHubSlugs(): Genre[] {
  return (Object.keys(genreLabels) as Genre[]).filter(
    (slug) => getArtistsByGenre(slug).length > 0,
  );
}

/** Artists tagged with a genre, ordered by curation tier then name. */
export function getGenreHubArtists(genre: Genre): Artist[] {
  return [...getArtistsByGenre(genre)].sort(
    (a, b) => a.curationTier - b.curationTier || a.name.localeCompare(b.name, "en"),
  );
}

/* -------------------------------------------------------------------------- */
/* "Artists like X" discovery hubs                                            */
/* -------------------------------------------------------------------------- */

/** Resolve an artist's curated similarArtists slugs to real Artist records. */
export function getSimilarArtists(slug: string): Artist[] {
  const artist = getArtist(slug);
  if (!artist) return [];
  const seen = new Set<string>([slug]);
  const out: Artist[] = [];
  for (const s of artist.similarArtists) {
    if (seen.has(s)) continue;
    const found = getArtist(s);
    if (found) {
      seen.add(s);
      out.push(found);
    }
  }
  return out;
}

/** Artist slugs that resolve to at least two similar artists (avoids thin pages). */
export function getSimilarHubSlugs(): string[] {
  return artists
    .filter((a) => getSimilarArtists(a.slug).length >= 2)
    .map((a) => a.slug);
}

