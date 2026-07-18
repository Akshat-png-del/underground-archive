import type { Genre } from "@/types";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { IMAGE_FALLBACK } from "@/lib/images";

const GENERIC_ARTWORK = new Set([IMAGE_FALLBACK, FALLBACK_IMAGE]);

/** True when coverArt is empty, genre placeholder, or not official Spotify artwork. */
export function isGenericArtworkFallback(url?: string | null): boolean {
  if (!url) return true;
  if (GENERIC_ARTWORK.has(url)) return true;
  if (url.includes("artist-fallback")) return true;
  if (url.includes("/images/genres/")) return true;
  if (url.includes("hero-atmospheric")) return true;
  // YouTube stills are set thumbnails — never valid album/track covers
  if (url.includes("i.ytimg.com") || url.includes("img.youtube.com")) return true;
  return false;
}

/**
 * Verified Spotify artwork only — never genre SVGs or invent placeholders.
 * Empty `src` means the UI should hide the artwork surface gracefully.
 */
export function resolveTrackArtwork(options: {
  coverArt?: string | null;
  genres?: Genre[];
}): { src: string; fallbacks: string[]; fallbackSrc: string } {
  void options.genres;
  const raw = options.coverArt?.trim();
  const hasRealArt = !!raw && !isGenericArtworkFallback(raw);

  return {
    src: hasRealArt ? raw : "",
    fallbacks: [],
    fallbackSrc: "",
  };
}
