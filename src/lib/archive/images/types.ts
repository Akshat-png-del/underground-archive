import type { CurationTier } from "@/lib/archive/curation/tiers";

/** Official source types in priority order (lower = higher priority). */
export type ImageSourceType =
  | "spotify"
  | "official-website"
  | "instagram"
  | "facebook"
  | "resident-advisor"
  | "label-press"
  | "festival-press"
  | "beatport"
  | "editorial-publication"
  | "pending-review"
  | "unavailable";

export interface ImageCrossChecks {
  nameMatch: boolean;
  /** Spotify artist ID matches archive record */
  spotifyArtistIdMatch?: boolean;
  /** Instagram/RA handle matches known profile */
  handleMatch?: boolean;
  /** Label on release material matches artist labels */
  labelMatch?: boolean;
  /** Facial identity confirmed by curator (manual) */
  identityConfirmed?: boolean;
}

/** Manual curation record — only add when image is confidently verified. */
export interface VerifiedImageRecord {
  slug: string;
  artistName: string;
  imageUrl: string;
  /** Canonical page URL where the image was sourced */
  imageSource: string;
  sourceType: Exclude<ImageSourceType, "pending-review" | "unavailable">;
  attribution?: string;
  lastVerifiedAt: string;
  imageVerified: true;
  crossChecks: ImageCrossChecks;
  verificationNotes?: string;
}

export type ImageAuditClassification =
  | "verified"
  | "awaiting-verification"
  | "suspicious"
  | "broken";

export interface ImageAuditEntry {
  slug: string;
  name: string;
  tier: CurationTier;
  classification: ImageAuditClassification;
  imageUrl: string | null;
  sourceType: ImageSourceType;
  imageVerified: boolean;
  issues: string[];
}

export interface ImageAuditReport {
  generatedAt: string;
  totals: {
    artists: number;
    verified: number;
    awaitingVerification: number;
    suspicious: number;
    broken: number;
    duplicateUrls: number;
    coveragePercent: number;
  };
  verified: ImageAuditEntry[];
  awaitingVerification: ImageAuditEntry[];
  duplicateImages: { url: string; slugs: string[] }[];
  suspiciousAssignments: ImageAuditEntry[];
  brokenUrls: ImageAuditEntry[];
  artists: ImageAuditEntry[];
}
