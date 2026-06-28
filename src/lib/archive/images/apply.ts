import type { Artist, ArtistImage } from "@/types";
import { getIngestedMetadata } from "@/content/artists/metadata";
import { getGenreArtwork } from "@/lib/archive/genre-artwork";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { getResearchBySlug } from "@/content/artists/research";
import { getVerifiedImageRecord } from "@/content/artists/images/verified";
import {
  isBlockedImageUrl,
  researchImageToArtistImage,
  shouldReplaceVerifiedImage,
  validateVerifiedImageRecord,
  verifiedRecordToArtistImage,
} from "./validate";

function resolveFromRegistry(artist: Artist): ArtistImage | undefined {
  const record = getVerifiedImageRecord(artist.slug);
  if (!record) return undefined;
  const issues = validateVerifiedImageRecord(record, artist);
  if (issues.length > 0) return undefined;
  return verifiedRecordToArtistImage(record);
}

function resolveFromResearch(artist: Artist): ArtistImage | undefined {
  const research = getResearchBySlug(artist.slug);
  if (!research?.image) return undefined;
  return researchImageToArtistImage(research.image, artist.name);
}

function editorialImage(url: string, sourceType: ArtistImage["sourceType"]): ArtistImage {
  const source =
    sourceType === "spotify"
      ? "spotify"
      : sourceType === "instagram"
        ? "instagram"
        : sourceType === "label-press" || sourceType === "festival-press"
          ? sourceType
          : sourceType === "official-website"
            ? "official-website"
            : "fallback";

  return {
    url,
    source,
    sourceType,
    verified: false,
  };
}

function inferEditorialImage(artist: Artist, incoming?: ArtistImage): ArtistImage {
  if (incoming?.url && incoming.url !== FALLBACK_IMAGE && !isBlockedImageUrl(incoming.url)) {
    return incoming;
  }
  if (artist.image?.url && artist.image.url !== FALLBACK_IMAGE && !isBlockedImageUrl(artist.image.url)) {
    return artist.image;
  }
  if (artist.portrait && artist.portrait !== FALLBACK_IMAGE && !isBlockedImageUrl(artist.portrait)) {
    return editorialImage(artist.portrait, artist.image?.sourceType ?? "festival-press");
  }
  const genreArt = getGenreArtwork(artist.genres[0]);
  return editorialImage(genreArt, "editorial-publication");
}

/**
 * Display policy: verified > probably-correct editorial > genre artwork > neutral fallback.
 * Never strips working portraits. Only verified registry overrides lower tiers.
 */
export function resolveArtistImage(
  artist: Artist,
  incoming?: ArtistImage
): { portrait: string; image: ArtistImage } {
  const verifiedCandidates: ArtistImage[] = [];

  const registryImage = resolveFromRegistry(artist);
  if (registryImage?.verified) verifiedCandidates.push(registryImage);

  const researchImage = resolveFromResearch(artist);
  if (researchImage?.verified) verifiedCandidates.push(researchImage);

  if (incoming?.verified) verifiedCandidates.push(incoming);
  if (artist.image?.verified) verifiedCandidates.push(artist.image);

  let best: ArtistImage | undefined;
  for (const candidate of verifiedCandidates) {
    if (!candidate.verified) continue;
    if (!best || shouldReplaceVerifiedImage(best, candidate)) {
      best = candidate;
    }
  }

  if (best?.verified) {
    return { portrait: best.url, image: best };
  }

  const editorial = inferEditorialImage(artist, incoming);
  return { portrait: editorial.url, image: editorial };
}

/** Ordered fallback chain for SafeImage — tries next source on load failure. */
export function resolvePortraitFallbacks(
  artist: Pick<Artist, "portrait" | "heroImage" | "genres"> & {
    slug?: string;
    image?: ArtistImage;
  }
): string[] {
  const urls: string[] = [];

  if (artist.image?.verified && artist.image.url) urls.push(artist.image.url);
  if (artist.portrait && artist.portrait !== FALLBACK_IMAGE) urls.push(artist.portrait);
  if (
    artist.heroImage &&
    artist.heroImage !== FALLBACK_IMAGE &&
    artist.heroImage !== artist.portrait
  ) {
    urls.push(artist.heroImage);
  }

  if (artist.slug) {
    const ingested = getIngestedMetadata(artist.slug);
    if (ingested?.resolvedImage?.url) urls.push(ingested.resolvedImage.url);
    if (ingested?.spotify?.imageUrl) urls.push(ingested.spotify.imageUrl);
  }

  urls.push(getGenreArtwork(artist.genres[0]));
  urls.push(FALLBACK_IMAGE);

  return [...new Set(urls.filter((u) => u && !isBlockedImageUrl(u)))];
}

export function resolveDisplayPortrait(
  artist: Pick<Artist, "portrait" | "heroImage" | "genres" | "slug"> & {
    image?: ArtistImage;
  }
): string {
  const chain = resolvePortraitFallbacks(artist);
  return chain[0] ?? FALLBACK_IMAGE;
}

export function applyArtistImage(artist: Artist): Artist {
  const { portrait, image } = resolveArtistImage(artist, artist.image);
  return {
    ...artist,
    portrait,
    heroImage: portrait,
    image,
    imageSource: image.verified ? "editorial" : "fallback",
  };
}

export function hasVerifiedArtistImage(artist: Pick<Artist, "image">): boolean {
  return artist.image?.verified === true;
}

export function hasDisplayPortrait(artist: Pick<Artist, "portrait" | "image">): boolean {
  if (hasVerifiedArtistImage(artist)) return true;
  return !!artist.portrait && artist.portrait !== FALLBACK_IMAGE;
}
