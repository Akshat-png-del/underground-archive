import type { ImageSourceType } from "./types";

/** Lower number = higher editorial priority. Never overwrite verified with lower priority. */
export const SOURCE_TYPE_PRIORITY: Record<
  Exclude<ImageSourceType, "pending-review" | "unavailable">,
  number
> = {
  spotify: 1,
  "official-website": 2,
  instagram: 3,
  facebook: 4,
  "resident-advisor": 5,
  "label-press": 6,
  "festival-press": 7,
  beatport: 8,
  "editorial-publication": 9,
};

/** Domains/patterns that must never be used as artist portraits. */
export const BLOCKED_IMAGE_URL_PATTERNS: RegExp[] = [
  /pinterest\./i,
  /pin\.it\//i,
  /lookaside\.fbsbx\.com/i,
  /generated/i,
  /midjourney/i,
  /dall-?e/i,
  /stable-?diffusion/i,
  /thispersondoesnotexist/i,
  /placeholder/i,
  /picsum\.photos/i,
  /unsplash\.com\/random/i,
];

/** URLs that indicate non-portrait or unverified assignment. */
export const SUSPICIOUS_PORTRAIT_PATTERNS: RegExp[] = [
  /img\.youtube\.com\/vi\//i,
  /\/images\/genres\//,
  /artist-fallback\.svg/,
  /ytimg\.com/i,
];

/** Remote CDN URLs and locally hosted verified portrait assets. */
export const ALLOWED_IMAGE_URL_PATTERN = /^(https?:\/\/.+|\/images\/portraits\/.+)/i;
