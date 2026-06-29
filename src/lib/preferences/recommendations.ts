import { artists, getArtist, genreLabels } from "@/content/artists";
import { getDisplaySets } from "@/content/sets";
import { getDisplayTracks } from "@/content/tracks";
import type { Artist, Genre } from "@/types";
import type { UserPreferences } from "@/types/preferences";
import type { ArchiveSet } from "@/types/library";
import type { CatalogTrack } from "@/types/library";
import { halfDayIndex, pick } from "@/content/home/rotation";

function scoreArtist(artist: Artist, prefs: UserPreferences): number {
  let score = 0;
  if (prefs.favoriteArtists.includes(artist.slug)) score += 100;
  if (artist.genres.some((g) => prefs.favoriteGenres.includes(g))) score += 40;
  if (artist.moodTags.some((m) => prefs.favoriteMoods.includes(m))) score += 20;
  const [min, max] = prefs.bpmRange;
  if (artist.bpmRange[0] <= max && artist.bpmRange[1] >= min) score += 15;
  if (artist.trending) score += 10;
  if (artist.featured) score += 5;
  return score;
}

export interface DailyDiscovery {
  artist: Artist;
  set: ArchiveSet;
  track: CatalogTrack;
}

export function getTodaysDiscovery(prefs: UserPreferences): DailyDiscovery {
  const verified = artists.filter((a) => a.curationTier === 1);
  const ranked = [...verified].sort((a, b) => scoreArtist(b, prefs) - scoreArtist(a, prefs));
  const idx = halfDayIndex();
  const artist = ranked[idx % ranked.length] ?? verified[0] ?? artists[0];

  const sets = getDisplaySets().filter((s) => s.artistSlug === artist.slug);
  const allSets = sets.length ? sets : getDisplaySets();
  const set = allSets[(idx + 1) % allSets.length];

  const tracks = getDisplayTracks().filter((t) => t.artistSlug === artist.slug);
  const allTracks = tracks.length ? tracks : getDisplayTracks();
  const track = allTracks[(idx + 2) % allTracks.length];

  return { artist, set, track };
}

/** Deterministic SSR / first-paint snapshot — top-ranked artist, first set/track. */
export function getTodaysDiscoveryStatic(prefs: UserPreferences): DailyDiscovery {
  const verified = artists.filter((a) => a.curationTier === 1);
  const ranked = [...verified].sort((a, b) => scoreArtist(b, prefs) - scoreArtist(a, prefs));
  const artist = ranked[0] ?? verified[0] ?? artists[0];

  const sets = getDisplaySets().filter((s) => s.artistSlug === artist.slug);
  const allSets = sets.length ? sets : getDisplaySets();
  const set = allSets[0];

  const tracks = getDisplayTracks().filter((t) => t.artistSlug === artist.slug);
  const allTracks = tracks.length ? tracks : getDisplayTracks();
  const track = allTracks[0];

  return { artist, set, track };
}

export function getRecommendationsForArtist(seedSlug: string, limit = 6): Artist[] {
  const seed = getArtist(seedSlug);
  if (!seed) return [];
  const similar = seed.similarArtists
    .filter((s) => s !== seedSlug)
    .map((s) => getArtist(s))
    .filter((a): a is Artist => !!a);
  if (similar.length >= limit) return similar.slice(0, limit);
  const genreMatches = artists.filter(
    (a) =>
      a.slug !== seedSlug &&
      !similar.some((s) => s.slug === a.slug) &&
      a.genres.some((g) => seed.genres.includes(g))
  );
  return [...similar, ...genreMatches].slice(0, limit);
}

export function getRecommendationsForGenre(genre: Genre, limit = 6): Artist[] {
  return artists
    .filter((a) => a.genres.includes(genre) && a.curationTier <= 2)
    .sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0))
    .slice(0, limit);
}

export function getGenreRecommendationLabel(genre: Genre): string {
  return `If you enjoy ${genreLabels[genre] ?? genre}, explore:`;
}

export function getArtistRecommendationLabel(name: string): string {
  return `If you like ${name}, listen to:`;
}

export function getEmergingArtists(limit = 5): Artist[] {
  return [...artists]
    .filter((a) => a.trending && a.curationTier <= 2)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
        a.slug.localeCompare(b.slug, "en", { sensitivity: "base" }),
    )
    .slice(0, limit);
}
