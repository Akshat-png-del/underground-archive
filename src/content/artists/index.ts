import { artists } from "./all";
import { artistCollections, type ArtistCollectionSlug } from "./collections";
import { archiveSets } from "@/content/sets";

export { artists };

export { artistCollections, type ArtistCollectionSlug };

export function getArtist(slug: string) {
  return artists.find((a) => a.slug === slug);
}

export function getArtistsByCollection(slug: ArtistCollectionSlug) {
  const collection = artistCollections[slug];
  const bySlug = new Map<string, (typeof artists)[number]>();

  for (const s of collection.slugs) {
    const artist = getArtist(s);
    if (artist) bySlug.set(artist.slug, artist);
  }

  const genres = "genres" in collection ? collection.genres : undefined;
  if (genres?.length) {
    for (const artist of artists) {
      if (genres.some((g) => artist.genres.includes(g))) {
        bySlug.set(artist.slug, artist);
      }
    }
  }

  return [...bySlug.values()];
}

export function getCollectionArtistCount(slug: ArtistCollectionSlug): number {
  return getArtistsByCollection(slug).length;
}

export function getArtistsByGenre(genre: string) {
  return artists.filter((a) => a.genres.includes(genre as (typeof artists)[0]["genres"][number]));
}

export function getFeaturedArtists() {
  return artists.filter((a) => a.featured);
}

export function getTrendingArtists() {
  return artists.filter((a) => a.trending);
}

export const genreLabels: Record<string, string> = {
  "hard-techno": "Hard Techno",
  schranz: "Schranz",
  "industrial-techno": "Industrial Techno",
  "dark-techno": "Dark Techno",
  "peak-time-techno": "Peak Time Techno",
  "acid-techno": "Acid Techno",
  hardgroove: "Hardgroove",
  "hypnotic-techno": "Hypnotic Techno",
  ebm: "EBM",
  "industrial-ebm": "Industrial EBM",
  darkwave: "Darkwave",
  "post-punk": "Post-Punk",
  industrial: "Industrial",
};

export const moodLabels: Record<string, string> = {
  aggressive: "Aggressive",
  hypnotic: "Hypnotic",
  dark: "Dark",
  euphoric: "Euphoric",
  industrial: "Industrial",
  melancholic: "Melancholic",
  apocalyptic: "Apocalyptic",
  "fast-paced": "Fast-paced",
};

export const genreDescriptions: Record<string, string> = {
  "hard-techno": "Relentless kicks at 140–160 BPM. Born in warehouses, perfected in Berlin.",
  schranz: "Loop-driven hypnosis. Metallic percussion. German engineering for the dancefloor.",
  "industrial-techno": "Factory aesthetics meet techno. Distorted, dystopian, physical.",
  "dark-techno": "Cinematic dread and nocturnal tension — atmosphere before velocity.",
  "peak-time-techno": "Maximum energy for the moment the room ignites.",
  ebm: "Electronic Body Music — danceable industrial aggression from the 80s to today.",
  "industrial-ebm": "Harder body music at the intersection of EBM and industrial noise.",
  darkwave: "Cold synths, driving rhythms, gothic melancholy.",
  "post-punk": "Angular guitars and cold electronics — foundation of dark club culture.",
  industrial: "Noise, machinery, and rhythm. The foundation of underground electronic music.",
  "acid-techno": "303 squelch woven through pounding kicks. Psychedelic and punishing.",
  hardgroove:
    "Breakbeat pressure and rolling bass — UK and French scenes pushing hard techno into groove territory.",
  "hypnotic-techno":
    "Repetition as ritual. Subtle modulation, long blends, and trance without trance clichés.",
};

export const allLabels = [...new Set(artists.flatMap((a) => a.labels))].sort();
export const allCountries = [...new Set(artists.map((a) => a.country))].sort();

export function getAllSets() {
  return archiveSets.map((set) => ({
    title: set.title,
    venue: set.event,
    year: new Date(set.date).getFullYear(),
    youtubeId: set.youtubeId,
    artistName: set.artistName,
    artistSlug: set.artistSlug,
    thumbnail: set.thumbnail,
  }));
}
