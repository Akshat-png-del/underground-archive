import type { Genre } from "@/types";
import { getArtist } from "@/content/artists";
import { resolvePortrait, resolveHeroImage } from "@/lib/archive/verification";
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

/** Verified artist portrait/hero — never genre SVGs or invented placeholders. */
export function resolveVerifiedArtistArtForTrack(artistSlug?: string | null): string {
  if (!artistSlug) return "";
  const artist = getArtist(artistSlug);
  if (!artist) return "";

  const portrait = resolvePortrait(artist)?.trim();
  if (portrait && !isGenericArtworkFallback(portrait)) return portrait;

  const hero = resolveHeroImage(artist)?.trim();
  if (hero && !isGenericArtworkFallback(hero)) return hero;

  return "";
}

/**
 * Verified Spotify artwork first; otherwise verified artist portrait/hero.
 * Never invents covers or uses genre placeholders.
 */
export function resolveTrackArtwork(options: {
  coverArt?: string | null;
  genres?: Genre[];
  artistSlug?: string | null;
}): { src: string; fallbacks: string[]; fallbackSrc: string } {
  void options.genres;
  const raw = options.coverArt?.trim();
  const hasRealArt = !!raw && !isGenericArtworkFallback(raw);
  if (hasRealArt) {
    return { src: raw, fallbacks: [], fallbackSrc: "" };
  }

  const artistArt = resolveVerifiedArtistArtForTrack(options.artistSlug);
  return {
    src: artistArt,
    fallbacks: [],
    fallbackSrc: "",
  };
}
