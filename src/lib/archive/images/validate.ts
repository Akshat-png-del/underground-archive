import type { Artist, ArtistImage } from "@/types";
import type { ResearchImage } from "@/content/artists/research/types";
import { fieldVerified } from "@/content/artists/research/types";
import { namesMatch } from "@/lib/archive/pipeline/validate";
import {
  ALLOWED_IMAGE_URL_PATTERN,
  BLOCKED_IMAGE_URL_PATTERNS,
  SOURCE_TYPE_PRIORITY,
  SUSPICIOUS_PORTRAIT_PATTERNS,
} from "./constants";
import type { ImageCrossChecks, ImageSourceType, VerifiedImageRecord } from "./types";

export function isBlockedImageUrl(url: string): boolean {
  return BLOCKED_IMAGE_URL_PATTERNS.some((p) => p.test(url));
}

export function isSuspiciousPortraitUrl(url: string): boolean {
  return SUSPICIOUS_PORTRAIT_PATTERNS.some((p) => p.test(url));
}

export function isValidImageUrl(url: string): boolean {
  if (!url || !ALLOWED_IMAGE_URL_PATTERN.test(url)) return false;
  if (isBlockedImageUrl(url)) return false;
  return true;
}

export function sourceTypePriority(
  sourceType: Exclude<ImageSourceType, "pending-review" | "unavailable">
): number {
  return SOURCE_TYPE_PRIORITY[sourceType] ?? 99;
}

export function crossChecksPass(checks: ImageCrossChecks): boolean {
  if (!checks.nameMatch) return false;
  if (checks.spotifyArtistIdMatch === false) return false;
  if (checks.handleMatch === false) return false;
  if (checks.labelMatch === false) return false;
  return true;
}

export function validateVerifiedImageRecord(
  record: VerifiedImageRecord,
  artist: Pick<Artist, "slug" | "name" | "spotifyArtistId">
): string[] {
  const issues: string[] = [];

  if (record.slug !== artist.slug) {
    issues.push(`Registry slug mismatch: ${record.slug} vs ${artist.slug}`);
  }
  if (!record.imageVerified) {
    issues.push("Record is not marked imageVerified");
  }
  if (!isValidImageUrl(record.imageUrl)) {
    issues.push(`Invalid or blocked image URL: ${record.imageUrl}`);
  }
  if (!namesMatch(record.artistName, artist.name)) {
    issues.push(`Name mismatch: "${record.artistName}" vs "${artist.name}"`);
  }
  if (!crossChecksPass(record.crossChecks)) {
    issues.push("Cross-checks failed — image flagged for manual review");
  }
  if (record.crossChecks.spotifyArtistIdMatch && artist.spotifyArtistId) {
    const spotifyPath = record.imageSource.match(/artist\/([a-zA-Z0-9]{22})/);
    if (spotifyPath && spotifyPath[1] !== artist.spotifyArtistId) {
      issues.push("Spotify artist ID in imageSource does not match archive");
    }
  }

  return issues;
}

export function researchImageToArtistImage(
  image: ResearchImage,
  artistName: string
): ArtistImage | undefined {
  if (!fieldVerified(image.confidence)) return undefined;
  if (!isValidImageUrl(image.url)) return undefined;
  if (image.crossChecks && !crossChecksPass(image.crossChecks)) return undefined;

  const sourceType = image.sourceType ?? mapLegacySource(image.source);

  return {
    url: image.url,
    source: image.source,
    sourceType,
    verified: true,
    attribution: image.attribution,
    lastVerifiedAt: image.lastVerifiedAt ?? new Date().toISOString().slice(0, 10),
    imageSource: image.imageSource ?? image.source,
  };
}

function mapLegacySource(
  source: ArtistImage["source"]
): Exclude<ImageSourceType, "pending-review" | "unavailable"> {
  switch (source) {
    case "spotify":
      return "spotify";
    case "official-website":
      return "official-website";
    case "instagram":
      return "instagram";
    case "label-press":
      return "label-press";
    case "festival-press":
      return "festival-press";
    default:
      return "editorial-publication";
  }
}

export function verifiedRecordToArtistImage(record: VerifiedImageRecord): ArtistImage {
  return {
    url: record.imageUrl,
    source: legacySourceFromType(record.sourceType),
    sourceType: record.sourceType,
    verified: true,
    attribution: record.attribution,
    lastVerifiedAt: record.lastVerifiedAt,
    imageSource: record.imageSource,
  };
}

function legacySourceFromType(
  sourceType: VerifiedImageRecord["sourceType"]
): ArtistImage["source"] {
  switch (sourceType) {
    case "spotify":
      return "spotify";
    case "official-website":
      return "official-website";
    case "instagram":
      return "instagram";
    case "label-press":
    case "beatport":
      return "label-press";
    case "festival-press":
      return "festival-press";
    case "facebook":
    case "resident-advisor":
    case "editorial-publication":
      return "official-website";
  }
}

/** Higher priority wins; equal priority keeps incumbent. */
export function shouldReplaceVerifiedImage(
  current: ArtistImage,
  incoming: ArtistImage
): boolean {
  if (!current.verified) return true;
  if (!incoming.verified) return false;

  const currentType = current.sourceType;
  const incomingType = incoming.sourceType;
  if (
    currentType === "pending-review" ||
    currentType === "unavailable" ||
    incomingType === "pending-review" ||
    incomingType === "unavailable"
  ) {
    return incoming.verified && !current.verified;
  }

  return sourceTypePriority(incomingType) < sourceTypePriority(currentType);
}
