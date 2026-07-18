import type { Artist } from "@/types";
import { getIngestedMetadata } from "@/content/artists/metadata";
import { GENRE_HERO_SLUGS } from "@/content/artists/hero-overrides";
import { getGenreHeroArtwork } from "@/lib/archive/genre-artwork";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { ytThumb } from "@/lib/images";
import { isBlockedImageUrl } from "./validate";

const LOCAL_RESEARCHED = /^\/images\/portraits\/researched\/.+\.(jpg|jpeg|png|webp)$/i;

export function isLocalResearchedPortraitPath(url: string): boolean {
  return LOCAL_RESEARCHED.test(url);
}

function isRemoteUrl(url: string | undefined): url is string {
  return !!url && url.startsWith("http") && !isBlockedImageUrl(url);
}

function uniqueUrls(urls: (string | undefined)[]): string[] {
  return [...new Set(urls.filter((u): u is string => !!u && !isBlockedImageUrl(u)))];
}

/** Remote CDN URLs usable when local researched assets are absent.
 * Spotify artist images only — never YouTube channel thumbs (wrong identity risk).
 */
export function getRemotePortraitCandidates(
  artist: Pick<Artist, "slug" | "portrait" | "spotifyArtistId"> & {
    image?: Artist["image"];
  },
): string[] {
  const ingested = artist.slug ? getIngestedMetadata(artist.slug) : undefined;

  const fromIngested = uniqueUrls([
    ...(ingested?.spotify?.imageUrls ?? []),
    ingested?.spotify?.imageUrl ?? undefined,
    ingested?.resolvedImage?.source === "spotify" ? ingested.resolvedImage.url : undefined,
  ].map((u) => u ?? undefined)).filter(isRemoteUrl);

  if (fromIngested.length > 0) return fromIngested;

  // Only accept artist.image when it was marked verified or is a Spotify CDN URL
  if (isRemoteUrl(artist.image?.url) && isSpotifyArtistImage(artist.image.url)) {
    return [artist.image.url];
  }
  if (isRemoteUrl(artist.portrait) && isSpotifyArtistImage(artist.portrait)) {
    return [artist.portrait];
  }

  return [];
}

function isSpotifyArtistImage(url: string): boolean {
  return (
    /i\.scdn\.co\/image\//.test(url) ||
    /image-cdn[^/]*\.spotifycdn\.com\//.test(url)
  );
}

function isYoutubeIdentityUrl(url: string): boolean {
  return (
    /yt3\.ggpht\.com/i.test(url) ||
    /ggpht\.com/i.test(url) ||
    /youtube\.com/i.test(url) ||
    /ytimg\.com/i.test(url)
  );
}

function isGenreOrPlaceholderUrl(url: string): boolean {
  return (
    url === FALLBACK_IMAGE ||
    url.includes("/images/genres/") ||
    url.includes("hero-atmospheric") ||
    url.includes("artist-fallback")
  );
}

export function preferRenderablePortraitUrl(
  artist: Pick<Artist, "slug" | "portrait" | "spotifyArtistId"> & {
    image?: Artist["image"];
  },
  resolvedPortrait: string,
): string {
  const remote = getRemotePortraitCandidates(artist)[0];

  if (isLocalResearchedPortraitPath(resolvedPortrait)) {
    if (remote) return remote;
    return resolvedPortrait;
  }

  // Never display YouTube channel avatars as artist identity photos
  if (resolvedPortrait && isYoutubeIdentityUrl(resolvedPortrait)) {
    return remote ?? "";
  }

  if (
    resolvedPortrait &&
    !isGenreOrPlaceholderUrl(resolvedPortrait) &&
    !isBlockedImageUrl(resolvedPortrait)
  ) {
    return resolvedPortrait;
  }

  // Prefer verified Spotify remote; otherwise empty — never genre SVG as identity.
  return remote ?? "";
}

function normalizeUrl(url: string): string {
  return url.split("?")[0] ?? url;
}

function urlsAreSame(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

/** Wide cinematic hero — never the same URL as the profile portrait. */
export function resolveHeroDisplayUrl(artist: Artist, portraitUrl: string): string {
  if (GENRE_HERO_SLUGS.has(artist.slug)) {
    return getGenreHeroArtwork(artist.genres[0]);
  }

  if (
    artist.heroImage &&
    artist.heroImage !== FALLBACK_IMAGE &&
    !isBlockedImageUrl(artist.heroImage) &&
    !isGenreOrPlaceholderUrl(artist.heroImage) &&
    !urlsAreSame(artist.heroImage, portraitUrl)
  ) {
    // Never substitute the portrait for a missing local hero file
    if (!isLocalResearchedPortraitPath(artist.heroImage)) {
      return artist.heroImage;
    }
  }

  // Prefer the artist's own verified set thumbnail (YouTube official still)
  const set = artist.essentialSets.find((s) => s.youtubeId?.trim());
  if (set?.youtubeId) {
    const thumb = ytThumb(set.youtubeId, "max");
    if (!urlsAreSame(thumb, portraitUrl)) return thumb;
  }

  // Atmospheric hero is preferable to a mismatched channel photo or portrait reuse
  return getGenreHeroArtwork(artist.genres[0]);
}

export function resolveHeroDisplayFallbacks(artist: Artist, portraitUrl: string): string[] {
  const primary = resolveHeroDisplayUrl(artist, portraitUrl);
  const set = artist.essentialSets.find((s) => s.youtubeId?.trim());

  return uniqueUrls([
    primary,
    set?.youtubeId ? ytThumb(set.youtubeId, "max") : undefined,
    set?.youtubeId ? ytThumb(set.youtubeId, "hq") : undefined,
    getGenreHeroArtwork(artist.genres[0]),
    FALLBACK_IMAGE,
  ]);
}

export function resolveStoredHeroImage(artist: Artist, portraitUrl: string): string {
  return resolveHeroDisplayUrl(artist, portraitUrl);
}

export function buildPortraitDisplayFallbacks(
  artist: Artist,
  portraitUrl: string,
  baseChain: string[],
): string[] {
  const remote = getRemotePortraitCandidates(artist);
  // Verified remotes only — never genre SVGs / artist-fallback as identity art.
  return uniqueUrls([portraitUrl, ...remote, ...baseChain]).filter(
    (url) => url && !isGenreOrPlaceholderUrl(url),
  );
}
