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
  const allSets = getDisplaySets();
  const allTracks = getDisplayTracks();

  for (let offset = 0; offset < ranked.length; offset++) {
    const artist = ranked[(idx + offset) % ranked.length]!;
    const sets = allSets.filter((s) => s.artistSlug === artist.slug);
    const tracks = allTracks.filter((t) => t.artistSlug === artist.slug);
    if (sets.length === 0 || tracks.length === 0) continue;
    return {
      artist,
      set: sets[(idx + 1) % sets.length]!,
      track: tracks[(idx + 2) % tracks.length]!,
    };
  }

  const artist = ranked[idx % ranked.length] ?? verified[0] ?? artists[0]!;
  // Last resort still requires same-artist pairing when possible.
  const sets = allSets.filter((s) => s.artistSlug === artist.slug);
  const tracks = allTracks.filter((t) => t.artistSlug === artist.slug);
  if (sets.length > 0 && tracks.length > 0) {
    return { artist, set: sets[0]!, track: tracks[0]! };
  }
  const any = ranked.find((a) => {
    const s = allSets.some((x) => x.artistSlug === a.slug);
    const t = allTracks.some((x) => x.artistSlug === a.slug);
    return s && t;
  })!;
  return {
    artist: any,
    set: allSets.find((s) => s.artistSlug === any.slug)!,
    track: allTracks.find((t) => t.artistSlug === any.slug)!,
  };
}

/** Deterministic SSR / first-paint snapshot — top-ranked artist, first set/track. */
export function getTodaysDiscoveryStatic(prefs: UserPreferences): DailyDiscovery {
  const verified = artists.filter((a) => a.curationTier === 1);
  const ranked = [...verified].sort((a, b) => scoreArtist(b, prefs) - scoreArtist(a, prefs));
  const allSets = getDisplaySets();
  const allTracks = getDisplayTracks();

  for (const artist of ranked) {
    const sets = allSets.filter((s) => s.artistSlug === artist.slug);
    const tracks = allTracks.filter((t) => t.artistSlug === artist.slug);
    if (sets.length === 0 || tracks.length === 0) continue;
    return { artist, set: sets[0]!, track: tracks[0]! };
  }

  const any = ranked.find((a) => {
    const s = allSets.some((x) => x.artistSlug === a.slug);
    const t = allTracks.some((x) => x.artistSlug === a.slug);
    return s && t;
  }) ?? ranked[0] ?? verified[0] ?? artists[0]!;
  return {
    artist: any,
    set: allSets.find((s) => s.artistSlug === any.slug) ?? allSets[0]!,
    track: allTracks.find((t) => t.artistSlug === any.slug) ?? allTracks[0]!,
  };
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
