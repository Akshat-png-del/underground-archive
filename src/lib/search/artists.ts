import { artists, genreLabels } from "@/content/artists";
import type { Artist } from "@/types";
import type { SearchResult } from "@/types/library";
import { resolvePortrait } from "@/lib/archive/verification";
import { bestFuzzyScore, fuzzyMatchScore, normalizeSearchText } from "@/lib/search/fuzzy";

const MIN_SUGGESTION_SCORE = 800;

export function getArtistSortLetter(name: string): string {
  const normalized = normalizeSearchText(name);
  const first = normalized[0]?.toUpperCase();
  if (first && /[A-Z]/.test(first)) return first;
  return "#";
}

export interface ArtistLetterGroup {
  letter: string;
  artists: Artist[];
}

export function groupArtistsAlphabetically(): ArtistLetterGroup[] {
  const sorted = [...artists].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );

  const map = new Map<string, Artist[]>();
  for (const artist of sorted) {
    const letter = getArtistSortLetter(artist.name);
    const group = map.get(letter) ?? [];
    group.push(artist);
    map.set(letter, group);
  }

  const letters = [...map.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return letters.map((letter) => ({
    letter,
    artists: map.get(letter)!,
  }));
}

export function artistSearchFields(artist: Artist): string[] {
  return [
    artist.name,
    artist.slug.replace(/-/g, " "),
    artist.city,
    artist.country,
    ...artist.genres.map((g) => genreLabels[g]),
    ...artist.labels,
  ];
}

export function artistSuggestFields(artist: Artist, query: string): string[] {
  if (query.length === 1) {
    return [artist.name, artist.slug.replace(/-/g, " ")];
  }
  return artistSearchFields(artist);
}

export function artistToSearchResult(artist: Artist): SearchResult {
  return {
    type: "artist",
    id: artist.slug,
    title: artist.name,
    subtitle: `${artist.city} · ${artist.genres.map((g) => genreLabels[g]).join(", ")}`,
    href: `/artists/${artist.slug}`,
    image: resolvePortrait(artist),
  };
}

export function suggestArtists(query: string, limit = 8): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const ranked = artists
    .map((artist) => {
      const fields = artistSuggestFields(artist, q);
      const nameScore = fuzzyMatchScore(q, artist.name);
      const score = bestFuzzyScore(q, fields) + (nameScore > 0 ? 200 : 0);
      return { artist, score };
    })
    .filter(({ score }) => score >= MIN_SUGGESTION_SCORE);

  const sorted =
    q.length === 1
      ? ranked.sort((a, b) =>
          a.artist.name.localeCompare(b.artist.name, "en", { sensitivity: "base" }),
        )
      : ranked.sort(
          (a, b) =>
            b.score - a.score ||
            a.artist.name.localeCompare(b.artist.name, "en", { sensitivity: "base" }),
        );

  return sorted.slice(0, limit).map(({ artist }) => artistToSearchResult(artist));
}
