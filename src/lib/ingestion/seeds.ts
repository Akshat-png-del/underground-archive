import { coreArtists } from "@/content/artists/data";
import { catalogArtists } from "@/content/artists/catalog";
import { bulkCatalogArtists } from "@/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "@/content/artists/catalog-expansion";
import type { ArtistSeed } from "./types";

const rawArtists = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
];

const slugToSpotifyId = new Map<string, string>();

for (const artist of rawArtists) {
  if (artist.spotifyArtistId) {
    slugToSpotifyId.set(artist.slug, artist.spotifyArtistId);
  }
}

export function getArtistSeeds(): ArtistSeed[] {
  return rawArtists.map((a) => ({
    slug: a.slug,
    name: a.name,
    spotifyArtistId: a.spotifyArtistId,
    country: a.country,
  }));
}

export function getArtistSeed(slug: string): ArtistSeed | undefined {
  return getArtistSeeds().find((s) => s.slug === slug);
}

/** Map Spotify related artist names/IDs to archive slugs. */
export function mapRelatedToSlugs(
  related: { id: string; name: string }[]
): string[] {
  const bySpotifyId = new Map<string, string>();
  for (const [slug, id] of slugToSpotifyId) {
    bySpotifyId.set(id, slug);
  }

  const nameToSlug = new Map(
    rawArtists.map((a) => [a.name.toLowerCase(), a.slug])
  );

  const slugs: string[] = [];
  for (const r of related) {
    const byId = bySpotifyId.get(r.id);
    if (byId) {
      slugs.push(byId);
      continue;
    }
    const byName = nameToSlug.get(r.name.toLowerCase());
    if (byName) slugs.push(byName);
  }

  return [...new Set(slugs)];
}
