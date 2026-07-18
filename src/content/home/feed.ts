import { getDisplaySets } from "@/content/sets";
import { getDisplayTracks, sortCatalogTracksDeterministic } from "@/content/tracks";
import { getPublicPlaylists } from "@/lib/library/store";
import type { Artist } from "@/types";
import type { ArchiveSet } from "@/types/library";
import { trendingGenres } from "@/content/home/index";
import {
  getHomepageExposureLayout,
  getHomepageExposureLayoutStatic,
} from "@/content/home/exposure-budget";
import { fiveMinuteIndex } from "@/content/home/rotation";

export function getArtistOfWeek(): Artist {
  return getHomepageExposureLayout().artistOfWeek;
}

/** Deterministic within the current 5-minute exposure window (SSR-safe). */
export function getArtistOfWeekStatic(): Artist {
  return getHomepageExposureLayoutStatic().artistOfWeek;
}

export function getMostViewedArtistsThisWeek(): Artist[] {
  return getHomepageExposureLayout().trendingViewed;
}

export function getMostViewedArtistsThisWeekStatic(): Artist[] {
  return getHomepageExposureLayoutStatic().trendingViewed;
}

export function getTrendingArtistsThisWeek(): Artist[] {
  return getHomepageExposureLayout().trendingViewed;
}

export function getTrendingThisWeek() {
  return getTrendingArtistsThisWeek();
}

export function getTrendingGenresThisWeek() {
  const rot = fiveMinuteIndex();
  return [...trendingGenres]
    .sort((a, b) => b.count - a.count)
    .slice(rot % 2)
    .concat(trendingGenres)
    .slice(0, 6);
}

export function getTrendingGenresThisWeekStatic() {
  return [...trendingGenres].sort((a, b) => b.count - a.count).slice(0, 6);
}

export function getWeeklyDiscoveries(): Artist[] {
  return getHomepageExposureLayout().weeklyArtists;
}

export interface WeeklyDiscoveriesEditorial {
  artists: Artist[];
  tracks: ReturnType<typeof getDisplayTracks>;
  sets: ArchiveSet[];
}

export function getWeeklyDiscoveriesEditorial(): WeeklyDiscoveriesEditorial {
  const layout = getHomepageExposureLayout();
  return {
    artists: layout.weeklyArtists,
    tracks: layout.weeklyTracks,
    sets: layout.weeklySets,
  };
}

export function getWeeklyDiscoveriesEditorialStatic(): WeeklyDiscoveriesEditorial {
  const layout = getHomepageExposureLayoutStatic();
  return {
    artists: layout.weeklyArtists,
    tracks: layout.weeklyTracks,
    sets: layout.weeklySets,
  };
}

export function getEssentialSetOfDay(): ArchiveSet {
  return getHomepageExposureLayout().essentialSet;
}

export function getEssentialSetOfDayStatic(): ArchiveSet {
  return getHomepageExposureLayoutStatic().essentialSet;
}

export function getRecentlyAddedSets(): ArchiveSet[] {
  return getDisplaySets().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
}

export function getHorBerlinSection(limit = 8): ArchiveSet[] {
  return getHomepageExposureLayout().horBerlin.slice(0, limit);
}

export function getHorBerlinSectionStatic(limit = 8): ArchiveSet[] {
  return getHomepageExposureLayoutStatic().horBerlin.slice(0, limit);
}

export function getMostPlayedSets(): ArchiveSet[] {
  return getHomepageExposureLayout().communitySets.slice(0, 6);
}

export function getNewUndergroundReleases() {
  return getHomepageExposureLayoutStatic().releases;
}

export function getMostSavedArtists(): Artist[] {
  return getHomepageExposureLayout().mostSaved;
}

export function getMostSavedArtistsStatic(): Artist[] {
  return getHomepageExposureLayoutStatic().mostSaved;
}

/** Trending strip “most saved” — budgeted separately from Most Saved Artists section. */
export function getTrendingSavedArtists(): Artist[] {
  return getHomepageExposureLayout().trendingSaved;
}

export function getTrendingSavedArtistsStatic(): Artist[] {
  return getHomepageExposureLayoutStatic().trendingSaved;
}

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
  return getHomepageExposureLayout().communitySets.slice(0, limit);
}

export function getMostDiscussedArtists(limit = 4): Artist[] {
  return getHomepageExposureLayout().communityDiscussed.slice(0, limit);
}

export function getMostDiscussedArtistsStatic(): Artist[] {
  return getHomepageExposureLayoutStatic().communityDiscussed;
}

export function getEditorsPicks(): Artist[] {
  return getHomepageExposureLayout().trendingViewed.slice(0, 8);
}

export function getRecentlyAddedTracks(limit = 6) {
  const layout = getHomepageExposureLayout();
  const used = new Set(layout.weeklyTracks.map((t) => t.id));
  const rest = sortCatalogTracksDeterministic(getDisplayTracks())
    .filter((t) => !used.has(t.id))
    .sort((a, b) => {
      const byYear = b.releaseYear - a.releaseYear;
      if (byYear !== 0) return byYear;
      return a.id.localeCompare(b.id);
    });
  return [...layout.weeklyTracks, ...rest].slice(0, limit);
}

export function getRisingArtists(limit = 4): Artist[] {
  return getHomepageExposureLayout().communityDiscussed.slice(0, limit);
}

export function getHomepageDiscovery() {
  return getHomepageExposureLayout().discovery;
}

export function getHomepageDiscoveryStatic() {
  return getHomepageExposureLayoutStatic().discovery;
}

export {
  weekIndex,
  halfDayIndex,
  pageLoadIndex,
  fiveMinuteIndex,
} from "./rotation";

export {
  getHomepageExposureLayout,
  getHomepageExposureLayoutStatic,
  auditHomepageExposure,
} from "./exposure-budget";
