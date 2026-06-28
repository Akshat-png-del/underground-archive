import type { Genre } from "@/types";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";

/** Curated genre placeholder artwork — used when no artist portrait is available. */
const GENRE_ARTWORK: Partial<Record<Genre, string>> = {
  "hard-techno": "/images/genres/techno.svg",
  schranz: "/images/genres/techno.svg",
  "peak-time-techno": "/images/genres/techno.svg",
  hardgroove: "/images/genres/techno.svg",
  "acid-techno": "/images/genres/techno.svg",
  "hypnotic-techno": "/images/genres/industrial.svg",
  "industrial-techno": "/images/genres/industrial.svg",
  "dark-techno": "/images/genres/industrial.svg",
  ebm: "/images/genres/ebm.svg",
  "industrial-ebm": "/images/genres/ebm.svg",
  industrial: "/images/genres/ebm.svg",
  darkwave: "/images/genres/darkwave.svg",
  "post-punk": "/images/genres/darkwave.svg",
};

export function getGenreArtwork(genre?: Genre): string {
  if (!genre) return FALLBACK_IMAGE;
  return GENRE_ARTWORK[genre] ?? FALLBACK_IMAGE;
}
