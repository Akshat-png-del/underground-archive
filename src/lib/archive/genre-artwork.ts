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

/** Wide atmospheric hero when no performance still exists — distinct from square genre portraits. */
export function getGenreHeroArtwork(genre?: Genre): string {
  if (!genre) return "/images/hero-atmospheric.svg";
  const heroMap: Partial<Record<Genre, string>> = {
    "hard-techno": "/images/hero-atmospheric.svg",
    schranz: "/images/hero-atmospheric.svg",
    "peak-time-techno": "/images/hero-atmospheric.svg",
    hardgroove: "/images/hero-atmospheric.svg",
    "acid-techno": "/images/hero-atmospheric.svg",
    "hypnotic-techno": "/images/hero-atmospheric.svg",
    "industrial-techno": "/images/hero-atmospheric.svg",
    "dark-techno": "/images/hero-atmospheric.svg",
    ebm: "/images/hero-atmospheric.svg",
    "industrial-ebm": "/images/hero-atmospheric.svg",
    industrial: "/images/hero-atmospheric.svg",
    darkwave: "/images/hero-atmospheric.svg",
    "post-punk": "/images/hero-atmospheric.svg",
  };
  return heroMap[genre] ?? "/images/hero-atmospheric.svg";
}
