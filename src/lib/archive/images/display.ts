import type { Artist } from "@/types";
import { getIngestedMetadata } from "@/content/artists/metadata";
import { getVerifiedImageRecord } from "@/content/artists/images/verified";
import { getGenreArtwork, getGenreHeroArtwork } from "@/lib/archive/genre-artwork";
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

/** Remote CDN / channel URLs usable when local researched assets are absent. */
export function getRemotePortraitCandidates(
  artist: Pick<Artist, "slug" | "portrait" | "spotifyArtistId"> & {
    image?: Artist["image"];
  },
): string[] {
  const ingested = artist.slug ? getIngestedMetadata(artist.slug) : undefined;

  const fromIngested = uniqueUrls([
    ...(ingested?.spotify?.imageUrls ?? []),
    ingested?.spotify?.imageUrl,
    ingested?.youtube?.thumbnailUrl,
    ingested?.resolvedImage?.url,
  ]).filter(isRemoteUrl);

  if (fromIngested.length > 0) return fromIngested;

  if (isRemoteUrl(artist.image?.url)) return [artist.image.url];
  if (isRemoteUrl(artist.portrait)) return [artist.portrait];

  return [];
}

export function preferRenderablePortraitUrl(
  artist: Pick<Artist, "slug" | "portrait" | "spotifyArtistId"> & {
    image?: Artist["image"];
  },
  resolvedPortrait: string,
): string {
  if (isLocalResearchedPortraitPath(resolvedPortrait)) {
    const remote = getRemotePortraitCandidates(artist)[0];
    if (remote) return remote;
  }

  if (resolvedPortrait && resolvedPortrait !== FALLBACK_IMAGE && !isBlockedImageUrl(resolvedPortrait)) {
    return resolvedPortrait;
  }

  return getRemotePortraitCandidates(artist)[0] ?? getGenreArtwork((artist as Artist).genres?.[0]) ?? FALLBACK_IMAGE;
}

function normalizeUrl(url: string): string {
  return url.split("?")[0] ?? url;
}

function urlsAreSame(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

/** Wide cinematic hero — never the same URL as the profile portrait. */
export function resolveHeroDisplayUrl(artist: Artist, portraitUrl: string): string {
  if (
    artist.heroImage &&
    artist.heroImage !== FALLBACK_IMAGE &&
    !isBlockedImageUrl(artist.heroImage) &&
    !urlsAreSame(artist.heroImage, portraitUrl)
  ) {
    if (isLocalResearchedPortraitPath(artist.heroImage)) {
      const remote = getRemotePortraitCandidates(artist)[0];
      if (remote && !urlsAreSame(remote, portraitUrl)) return remote;
    } else {
      return artist.heroImage;
    }
  }

  const set = artist.essentialSets.find((s) => s.youtubeId?.trim());
  if (set?.youtubeId) {
    const thumb = ytThumb(set.youtubeId, "max");
    if (!urlsAreSame(thumb, portraitUrl)) return thumb;
  }

  const ingested = getIngestedMetadata(artist.slug);
  if (
    isRemoteUrl(ingested?.youtube?.thumbnailUrl) &&
    !urlsAreSame(ingested.youtube.thumbnailUrl, portraitUrl)
  ) {
    return ingested.youtube.thumbnailUrl;
  }

  const genreHero = getGenreHeroArtwork(artist.genres[0]);
  if (!urlsAreSame(genreHero, portraitUrl)) return genreHero;

  return genreHero;
}

export function resolveHeroDisplayFallbacks(artist: Artist, portraitUrl: string): string[] {
  const primary = resolveHeroDisplayUrl(artist, portraitUrl);
  const set = artist.essentialSets.find((s) => s.youtubeId?.trim());

  return uniqueUrls([
    primary,
    set?.youtubeId ? ytThumb(set.youtubeId, "max") : undefined,
    set?.youtubeId ? ytThumb(set.youtubeId, "hq") : undefined,
    getIngestedMetadata(artist.slug)?.youtube?.thumbnailUrl,
    getGenreHeroArtwork(artist.genres[0]),
    getGenreArtwork(artist.genres[0]),
    portraitUrl !== primary ? portraitUrl : undefined,
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
  return uniqueUrls([
    portraitUrl,
    ...remote,
    ...baseChain,
    getGenreArtwork(artist.genres[0]),
    FALLBACK_IMAGE,
  ]);
}
