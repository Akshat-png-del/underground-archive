import type { Genre } from "@/types";
import { getGenreArtwork } from "@/lib/archive/genre-artwork";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { IMAGE_FALLBACK } from "@/lib/images";

const GENERIC_ARTWORK = new Set([IMAGE_FALLBACK, FALLBACK_IMAGE]);

const TRACK_FALLBACK = "/images/genres/techno.svg";

/** True when coverArt is empty or the artist portrait placeholder (not valid track art). */
export function isGenericArtworkFallback(url?: string | null): boolean {
  if (!url) return true;
  if (GENERIC_ARTWORK.has(url)) return true;
  return url.includes("artist-fallback");
}

function genrePlaceholder(genres?: Genre[]): string {
  return genres?.[0] ? getGenreArtwork(genres[0]) : TRACK_FALLBACK;
}

export function resolveTrackArtwork(options: {
  coverArt?: string | null;
  genres?: Genre[];
}): { src: string; fallbacks: string[]; fallbackSrc: string } {
  const genreArt = genrePlaceholder(options.genres);
  const raw = options.coverArt?.trim();
  const hasRealArt = raw && !isGenericArtworkFallback(raw);

  const src = hasRealArt ? raw : genreArt;
  const fallbacks: string[] = [];

  if (hasRealArt && raw !== genreArt) {
    fallbacks.push(genreArt);
  }

  return {
    src,
    fallbacks,
    fallbackSrc: genreArt,
  };
}
