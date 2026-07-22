import { artists, genreLabels } from "@/content/artists";
import { catalogTracks } from "@/content/tracks";
import { archiveSets } from "@/content/sets";
import type { SearchResult } from "@/types/library";
import { artistSearchFields, artistSuggestFields, artistToSearchResult } from "@/lib/search/artists";
import { bestFuzzyScore } from "@/lib/search/fuzzy";
import { resolveTrackArtwork } from "@/lib/music/track-artwork";

export { suggestArtists, groupArtistsAlphabetically, getArtistSortLetter } from "@/lib/search/artists";
export type { ArtistLetterGroup } from "@/lib/search/artists";

const MIN_RESULT_SCORE = 800;

type ScoredResult = SearchResult & { score: number };

function rankResults(items: ScoredResult[], limit: number): SearchResult[] {
  return items
    .filter((item) => item.score >= MIN_RESULT_SCORE)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
    .slice(0, limit)
    .map(({ score: _score, ...result }) => result);
}

export function searchAll(query: string, limit = 24): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: ScoredResult[] = [];

  for (const artist of artists) {
    const fields = artistSuggestFields(artist, q);
    const score = bestFuzzyScore(q, fields);
    if (score > 0) {
      results.push({ ...artistToSearchResult(artist), score });
    }
  }

  for (const track of catalogTracks) {
    const score = bestFuzzyScore(q, [track.title, track.artist]);
    if (score > 0) {
      const art = resolveTrackArtwork({
        coverArt: track.coverArt,
        artistSlug: track.artistSlug,
      });
      results.push({
        type: "track",
        id: track.id,
        title: track.title,
        subtitle: track.artist,
        href: `/artists/${track.artistSlug}`,
        image: art.src || undefined,
        score,
      });
    }
  }

  for (const set of archiveSets) {
    const score = bestFuzzyScore(q, [set.title, set.artistName, set.event, set.location]);
    if (score > 0) {
      results.push({
        type: "set",
        id: set.id,
        title: set.title,
        subtitle: `${set.artistName} · ${set.event}`,
        href: `/sets/${set.slug}`,
        image: set.thumbnail,
        score,
      });
    }
  }

  for (const [slug, label] of Object.entries(genreLabels)) {
    const score = bestFuzzyScore(q, [label, slug.replace(/-/g, " ")]);
    if (score > 0) {
      results.push({
        type: "genre",
        id: slug,
        title: label,
        subtitle: "Genre",
        href: `/genres/${slug}`,
        score,
      });
    }
  }

  return rankResults(results, limit);
}
