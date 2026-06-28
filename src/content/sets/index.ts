import { artists } from "@/content/artists/all";
import type { ArchiveSet, SetCategory } from "@/types/library";
import { artistId } from "@/lib/archive/ids";
import { canDisplaySet } from "@/lib/archive/verification";
import { setId, slugify } from "@/lib/music";
import { ytThumb } from "@/lib/images";

export const setCategoryLabels: Record<SetCategory, string> = {
  "boiler-room": "Boiler Room",
  "hor-berlin": "HÖR Berlin",
  intercell: "Intercell",
  possession: "Possession",
  teletech: "Teletech",
  awakenings: "Awakenings",
  "stone-techno": "Stone Techno",
  verknipt: "Verknipt",
  other: "Other",
};

function inferCategory(venue: string, title: string): SetCategory {
  const v = `${venue} ${title}`.toLowerCase();
  if (v.includes("boiler room")) return "boiler-room";
  if (v.includes("hör") || v.includes("hor berlin")) return "hor-berlin";
  if (v.includes("intercell")) return "intercell";
  if (v.includes("possession")) return "possession";
  if (v.includes("teletech")) return "teletech";
  if (v.includes("awakenings")) return "awakenings";
  if (v.includes("stone techno")) return "stone-techno";
  if (v.includes("verknipt")) return "verknipt";
  return "other";
}

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
  set: { title: string; venue: string; year: number; youtubeId: string; verified: boolean }
): ArchiveSet {
  const id = setId(artistSlug, set.title);
  const category = inferCategory(set.venue, set.title);
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
    duration: "1:00:00",
    youtubeId: set.youtubeId,
    genres,
    bpm,
    energy,
    location: inferLocation(set.venue, artistCity),
    thumbnail: ytThumb(set.youtubeId, "hq"),
  };
}

/** Only editorially verified essential sets — no generated or pooled embeds. */
export const archiveSets: ArchiveSet[] = artists.flatMap((artist) =>
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
        }
      )
    )
);

export function getVerifiedSets(): ArchiveSet[] {
  return archiveSets.filter((s) => s.verified);
}

/** All displayable sets — default for UI (not gated on verified metadata). */
export function getDisplaySets(): ArchiveSet[] {
  return archiveSets;
}

export function getSet(idOrSlug: string): ArchiveSet | undefined {
  return archiveSets.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

export function getSetsByCategory(category: SetCategory): ArchiveSet[] {
  return archiveSets.filter((s) => s.category === category);
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
