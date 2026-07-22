import { artists } from "@/content/artists/all";
import type { ArchiveSet, SetCategory } from "@/types/library";
import { artistId } from "@/lib/archive/ids";
import { canDisplaySet } from "@/lib/archive/verification";
import { getVerifiedSetDuration } from "@/lib/catalog/apply-authenticity";
import { setId, slugify } from "@/lib/music";
import { ytThumb } from "@/lib/images";
import {
  inferSetCollection,
  durationToMinutes,
  SET_COLLECTION_ORDER,
} from "@/content/sets/collections";

export {
  setCategoryLabels,
  SET_COLLECTION_ORDER,
  setCollectionDescriptions,
  filterArchiveSets,
  getSetFilterOptions,
  getVisibleSetCollections,
  durationToMinutes,
  inferSetCollection,
  DURATION_BUCKET_LABELS,
} from "@/content/sets/collections";

export type { SetArchiveFilters, DurationBucket } from "@/content/sets/collections";

function inferLocation(venue: string, artistCity: string): string {
  const v = venue.toLowerCase();
  if (v.includes("berlin")) return "Berlin, Germany";
  if (v.includes("madrid")) return "Madrid, Spain";
  if (v.includes("amsterdam")) return "Amsterdam, Netherlands";
  if (v.includes("barcelona")) return "Barcelona, Spain";
  if (v.includes("manchester")) return "Manchester, UK";
  if (v.includes("london")) return "London, UK";
  return artistCity;
}

function buildSet(
  artistSlug: string,
  artistName: string,
  artistCity: string,
  genres: ArchiveSet["genres"],
  bpm: number | undefined,
  energy: number | undefined,
  set: { title: string; venue: string; year: number; youtubeId: string; verified: boolean },
): ArchiveSet {
  const id = setId(artistSlug, set.title);
  const category = inferSetCollection(set.venue, set.title);
  return {
    id,
    slug: slugify(artistSlug, set.title),
    title: set.title,
    artistName,
    artistSlug,
    artistId: artistId(artistSlug),
    verified: set.verified,
    event: set.venue,
    category,
    date: `${set.year}-06-15`,
    duration: getVerifiedSetDuration(set.youtubeId),
    youtubeId: set.youtubeId,
    genres,
    bpm,
    energy,
    location: inferLocation(set.venue, artistCity),
    thumbnail: ytThumb(set.youtubeId, "hq"),
    description: `${artistName} at ${set.venue} (${set.year}) — a verified long-form ${genres
      .slice(0, 2)
      .map((genre) => genre.replace(/-/g, " "))
      .join(" / ")} performance.`,
  };
}

/**
 * Prefer the artist whose name appears earliest in the set title when the same
 * YouTube upload is attached to multiple profiles (B2B / shared bills).
 */
function dedupeByYoutubeId(sets: ArchiveSet[]): ArchiveSet[] {
  const byYt = new Map<string, ArchiveSet>();
  for (const set of sets) {
    const existing = byYt.get(set.youtubeId);
    if (!existing) {
      byYt.set(set.youtubeId, set);
      continue;
    }
    const title = set.title.toLowerCase();
    const existingIdx = title.indexOf(existing.artistName.toLowerCase());
    const nextIdx = title.indexOf(set.artistName.toLowerCase());
    const existingRank = existingIdx === -1 ? Number.MAX_SAFE_INTEGER : existingIdx;
    const nextRank = nextIdx === -1 ? Number.MAX_SAFE_INTEGER : nextIdx;
    if (nextRank < existingRank) byYt.set(set.youtubeId, set);
  }
  return [...byYt.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.artistName.localeCompare(b.artistName, "en"),
  );
}

/** Only editorially verified essential sets — no generated or pooled embeds. */
export const archiveSets: ArchiveSet[] = dedupeByYoutubeId(
  artists.flatMap((artist) =>
    artist.essentialSets
      .filter((set) => canDisplaySet(set, artist.id, artist.slug))
      .map((set) =>
        buildSet(
          artist.slug,
          artist.name,
          artist.city,
          artist.genres,
          Math.round((artist.bpmRange[0] + artist.bpmRange[1]) / 2),
          Math.min(10, Math.round(artist.soundScores.energy * 10) / 10),
          {
            title: set.title,
            venue: set.venue,
            year: set.year,
            youtubeId: set.youtubeId,
            verified: set.verified,
          },
        ),
      ),
  ),
);

/**
 * Dedicated mixtape / DJ-set inventory.
 * Every entry has a verified public YouTube source and API duration of at least 10 minutes.
 */
export const mixtapeSets: ArchiveSet[] = archiveSets.filter(
  (set) => set.verified && (durationToMinutes(set.duration) ?? 0) >= 10,
);

export function getVerifiedSets(): ArchiveSet[] {
  return mixtapeSets;
}

/** All displayable sets — default for UI (not gated on verified metadata). */
export function getDisplaySets(): ArchiveSet[] {
  return archiveSets;
}

export function getSet(idOrSlug: string): ArchiveSet | undefined {
  return archiveSets.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

export function getSetsByCategory(category: SetCategory): ArchiveSet[] {
  return mixtapeSets.filter((s) => s.category === category);
}

/**
 * Official HÖR Berlin performances only.
 * Prefers titles matching the HÖR Berlin naming pattern (`| HÖR` / `HÖR -` / `HÖR @`).
 * Clips, shorts, and non-HÖR uploads must never enter this list.
 */
/** Normalize HÖR / HÖR (precomposed vs combining diaeresis) for title matching. */
function foldHorTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function getHorBerlinSets(): ArchiveSet[] {
  return getSetsByCategory("hor-berlin")
    .filter((s) => {
      // Duration must be API-verified (authenticity pipeline); never show empty placeholders.
      if (!s.duration) return false;
      const title = foldHorTitle(s.title);
      const event = foldHorTitle(s.event);
      const branded =
        /\|\s*hor\b/.test(title) ||
        /\bhor\s*[-@x]/.test(title) ||
        /\bhor\s+on\s+tour/.test(title) ||
        /\bhor\s+berlin\b/.test(title) ||
        /\bx\s+hor\b/.test(title);
      const livestreamSlot =
        /\/\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*\//.test(
          title,
        );
      const venueOk = event.includes("hor berlin");
      // Branded titles always; livestream hour slots only when venue was set after channel verify.
      return branded || (venueOk && livestreamSlot);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function getSetsByArtist(slug: string): ArchiveSet[] {
  const id = artistId(slug);
  return archiveSets.filter((s) => s.artistId === id);
}

export function getSetsByGenre(genreSlug: string): ArchiveSet[] {
  return archiveSets.filter((s) => s.genres.includes(genreSlug as ArchiveSet["genres"][number]));
}

export function getTrendingSets(limit = 6): ArchiveSet[] {
  return archiveSets.slice(0, limit);
}

export function getCollectionCounts(): Record<SetCategory, number> {
  const counts = Object.fromEntries(SET_COLLECTION_ORDER.map((c) => [c, 0])) as Record<
    SetCategory,
    number
  >;
  for (const set of mixtapeSets) {
    counts[set.category] = (counts[set.category] ?? 0) + 1;
  }
  return counts;
}

export function archiveSetToEssential(set: ArchiveSet): import("@/types").EssentialSet {
  return {
    id: set.id,
    artistId: set.artistId,
    verified: set.verified,
    title: set.title,
    venue: set.event,
    year: new Date(set.date).getFullYear(),
    youtubeId: set.youtubeId,
  };
}
