import type { ArchiveSet } from "@/types/library";
import { archiveSets } from "@/content/sets";

function relatedScore(candidate: ArchiveSet, current: ArchiveSet): number {
  let score = 0;
  if (candidate.artistId === current.artistId) score += 4;
  if (candidate.category === current.category) score += 2;
  if (candidate.genres.some((g) => current.genres.includes(g))) score += 1;
  return score;
}

/** Sets to show below the watch player — same artist and category first. */
export function getRelatedSets(current: ArchiveSet, limit = 8): ArchiveSet[] {
  return archiveSets
    .filter((set) => set.id !== current.id)
    .map((set) => ({ set, score: relatedScore(set, current) }))
    .sort((a, b) => b.score - a.score || a.set.title.localeCompare(b.set.title))
    .slice(0, limit)
    .map(({ set }) => set);
}

/** More sets from the same artist. */
export function getMoreSetsByArtist(current: ArchiveSet, limit = 6): ArchiveSet[] {
  return archiveSets
    .filter((set) => set.id !== current.id && set.artistId === current.artistId)
    .slice(0, limit);
}
