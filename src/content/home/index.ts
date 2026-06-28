import { artists, getAllSets, getTrendingArtists, genreLabels } from "@/content/artists";

export const essentialSetsOfWeek = getAllSets().slice(0, 4);
export const weeklyDiscoveries = getTrendingArtists().slice(0, 4);
export const artistSpotlight = artists.find((a) => a.spotlight) || artists[0];

export const newReleases = artists.flatMap((a) =>
  [...a.eps, ...a.singles].slice(0, 1).map((r) => ({
    ...r,
    artist: a.name,
    artistSlug: a.slug,
  }))
).slice(0, 6);

export const trendingGenres = (
  [
    "hard-techno", "schranz", "industrial-techno", "dark-techno", "peak-time-techno",
    "acid-techno", "ebm", "industrial-ebm", "darkwave", "post-punk",
  ] as const
).map((slug) => ({
  slug,
  name: genreLabels[slug] ?? slug,
  count: artists.filter((a) => a.genres.includes(slug)).length,
}));
