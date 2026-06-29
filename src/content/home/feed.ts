import {
  artists,
  getArtist,
  getTrendingArtists,
} from "@/content/artists";
import { getDisplaySets } from "@/content/sets";
import { getDisplayTracks, sortCatalogTracksDeterministic } from "@/content/tracks";
import { getPublicPlaylists } from "@/lib/library/store";
import { getEmergingArtists } from "@/lib/preferences/recommendations";
import type { Artist } from "@/types";
import type { ArchiveSet } from "@/types/library";
import { trendingGenres } from "@/content/home/index";
import { halfDayIndex, pick, weekIndex } from "@/content/home/rotation";

const ARTIST_OF_WEEK_POOL = [
  "klangkuenstler", "sara-landry", "i-hate-models", "trym", "fantasm",
  "paula-temple", "charlotte-de-witte", "kobosil", "regal", "hadone",
];

export function getArtistOfWeek(): Artist {
  const slug = pick(ARTIST_OF_WEEK_POOL, weekIndex());
  return getArtist(slug) ?? artists[0];
}

/** Deterministic SSR / first-paint snapshot — no time-based rotation. */
export function getArtistOfWeekStatic(): Artist {
  const slug = ARTIST_OF_WEEK_POOL[0];
  return getArtist(slug) ?? artists[0];
}

export function getMostViewedArtistsThisWeek(): Artist[] {
  const pool = artists.filter((a) => a.curationTier <= 2 || a.trending);
  return [...pool]
    .sort((a, b) => (b.ratings?.dancefloorImpact ?? 0) - (a.ratings?.dancefloorImpact ?? 0))
    .slice(weekIndex() % 3)
    .concat(pool)
    .slice(0, 8);
}

/** Deterministic SSR / first-paint snapshot — no weekIndex rotation. */
export function getMostViewedArtistsThisWeekStatic(): Artist[] {
  const pool = artists.filter((a) => a.curationTier <= 2 || a.trending);
  return [...pool]
    .sort((a, b) => (b.ratings?.dancefloorImpact ?? 0) - (a.ratings?.dancefloorImpact ?? 0))
    .slice(0, 8);
}

export function getTrendingArtistsThisWeek(): Artist[] {
  const trending = getTrendingArtists();
  const sorted = [...trending].sort((a, b) => (b.ratings?.count ?? 0) - (a.ratings?.count ?? 0));
  return [...sorted.slice(weekIndex() % 3), ...sorted].slice(0, 8);
}

export function getTrendingThisWeek() {
  return getTrendingArtistsThisWeek();
}

export function getTrendingGenresThisWeek() {
  return [...trendingGenres]
    .sort((a, b) => b.count - a.count)
    .slice(weekIndex() % 2)
    .concat(trendingGenres)
    .slice(0, 6);
}

/** Deterministic SSR / first-paint snapshot — no weekIndex rotation. */
export function getTrendingGenresThisWeekStatic() {
  return [...trendingGenres].sort((a, b) => b.count - a.count).slice(0, 6);
}

export function getWeeklyDiscoveries(): Artist[] {
  return getEmergingArtists(5);
}

export interface WeeklyDiscoveriesEditorial {
  artists: Artist[];
  tracks: ReturnType<typeof getDisplayTracks>;
  sets: ArchiveSet[];
}

export function getWeeklyDiscoveriesEditorial(): WeeklyDiscoveriesEditorial {
  const emerging = getEmergingArtists(5);
  const tracks = getDisplayTracks().slice(weekIndex() % 3, weekIndex() % 3 + 3);
  const sets = getDisplaySets().slice(halfDayIndex() % 4, (halfDayIndex() % 4) + 2);
  return {
    artists: emerging.length ? emerging : artists.filter((a) => a.featured).slice(0, 5),
    tracks: tracks.length >= 3 ? tracks : getDisplayTracks().slice(0, 3),
    sets: sets.length >= 2 ? sets : getDisplaySets().slice(0, 2),
  };
}

/** Deterministic SSR/first-paint fallback — no Date.now / weekIndex during initial render. */
export function getWeeklyDiscoveriesEditorialStatic(): WeeklyDiscoveriesEditorial {
  return {
    artists: artists.filter((a) => a.featured).slice(0, 5),
    tracks: sortCatalogTracksDeterministic(getDisplayTracks()).slice(0, 3),
    sets: getDisplaySets().slice(0, 2),
  };
}

export function getEssentialSetOfDay(): ArchiveSet {
  const sets = getDisplaySets().sort((a, b) => b.date.localeCompare(a.date));
  if (sets.length === 0) throw new Error("No sets in archive");
  return sets[halfDayIndex() % sets.length];
}

/** Deterministic SSR / first-paint snapshot — newest set, no rotation. */
export function getEssentialSetOfDayStatic(): ArchiveSet {
  const sets = getDisplaySets().sort((a, b) => b.date.localeCompare(a.date));
  if (sets.length === 0) throw new Error("No sets in archive");
  return sets[0];
}

export function getRecentlyAddedSets(): ArchiveSet[] {
  return getDisplaySets().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
}

export function getMostPlayedSets(): ArchiveSet[] {
  return getDisplaySets()
    .sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0) || b.date.localeCompare(a.date))
    .slice(0, 6);
}

export function getNewUndergroundReleases() {
  return artists
    .filter((a) => a.curationTier === 1)
    .flatMap((a) =>
      [...a.singles, ...a.eps].slice(0, 1).map((r) => ({
        ...r,
        artist: a.name,
        artistSlug: a.slug,
      }))
    )
    .sort((a, b) => b.year - a.year)
    .slice(0, 8);
}

export function getMostSavedArtists(): Artist[] {
  return [...artists]
    .filter((a) => a.curationTier <= 2)
    .sort((a, b) => (b.ratings?.dancefloorImpact ?? 0) - (a.ratings?.dancefloorImpact ?? 0))
    .slice(0, 8);
}

/** Curated community playlists — Warehouse Energy, Industrial Darkness, Peak Time Chaos, etc. */
export function getCommunityPlaylists() {
  const featured = ["Warehouse Energy Playlist", "Industrial Darkness", "Peak Time Chaos", "Schranz Gym Playlist"];
  const sorted = getPublicPlaylists([]);
  const highlighted = featured
    .map((title) => sorted.find((p) => p.title === title))
    .filter(Boolean) as typeof sorted;
  const rest = sorted.filter((p) => !featured.includes(p.title));
  return [...highlighted, ...rest].slice(0, 8);
}

export function getCommunityFavorites() {
  return getCommunityPlaylists().slice(0, 6);
}

export function getMostLikedPlaylists(limit = 4) {
  return getPublicPlaylists([]).slice(0, limit);
}

export function getMostSavedSets(limit = 4) {
  return getDisplaySets()
    .sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))
    .slice(0, limit);
}

export function getMostDiscussedArtists(limit = 4): Artist[] {
  return [...artists]
    .filter((a) => a.curationTier === 1)
    .sort((a, b) => (b.ratings?.innovation ?? 0) - (a.ratings?.innovation ?? 0))
    .slice(0, limit);
}

export function getEditorsPicks(): Artist[] {
  return artists.filter((a) => a.featured || a.spotlight).slice(0, 8);
}

export function getRecentlyAddedTracks(limit = 6) {
  return sortCatalogTracksDeterministic(getDisplayTracks())
    .sort((a, b) => {
      const byYear = b.releaseYear - a.releaseYear;
      if (byYear !== 0) return byYear;
      const byTitle = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
      if (byTitle !== 0) return byTitle;
      return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
    })
    .slice(0, limit);
}

export function getRisingArtists(limit = 4): Artist[] {
  return artists.filter((a) => a.trending && a.curationTier <= 2).slice(0, limit);
}

export { weekIndex, halfDayIndex } from "./rotation";
