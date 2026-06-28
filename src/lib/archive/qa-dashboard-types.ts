import type { CurationTier, VerificationStatus } from "@/types";

export type ImageStatus = "verified" | "editorial" | "genre" | "pending-review" | "missing";

export interface ArtistQARow {
  slug: string;
  name: string;
  tier: CurationTier;
  verificationStatus: VerificationStatus;
  imageStatus: ImageStatus;
  portraitUrl: string;
  trackCount: number;
  setCount: number;
  promoted: boolean;
  flags: {
    missingImage: boolean;
    missingSets: boolean;
    missingTracks: boolean;
    missingBio: boolean;
    brokenSpotify: boolean;
    brokenYoutube: boolean;
    suspiciousMedia: boolean;
    isDuplicate: boolean;
  };
  issueCodes: string[];
  completeness: number;
}

export interface QADashboardSummary {
  totalArtists: number;
  tier1: number;
  tier2: number;
  tier3: number;
  missingImages: number;
  missingSets: number;
  missingTracks: number;
  brokenYoutube: number;
  brokenSpotify: number;
  missingBiographies: number;
  duplicateArtists: number;
  suspiciousMedia: number;
  qualityScore: number;
  promotedCount: number;
  verifiedImages: number;
  pendingReviewImages: number;
  suspiciousImages: number;
  imageCoveragePercent: number;
}

export interface QADashboardData {
  generatedAt: string;
  summary: QADashboardSummary;
  duplicateSlugs: string[];
  artists: ArtistQARow[];
  audit: {
    duplicateSlugs: string[];
  };
}

export type QADashboardFilter =
  | "all"
  | "missingImages"
  | "missingSets"
  | "missingBiographies"
  | "brokenLinks"
  | "tier1Only"
  | "suspiciousMedia";

export function filterQARows(rows: ArtistQARow[], filter: QADashboardFilter): ArtistQARow[] {
  switch (filter) {
    case "missingImages":
      return rows.filter((r) => r.flags.missingImage);
    case "missingSets":
      return rows.filter((r) => r.flags.missingSets);
    case "missingBiographies":
      return rows.filter((r) => r.flags.missingBio);
    case "brokenLinks":
      return rows.filter((r) => r.flags.brokenSpotify || r.flags.brokenYoutube);
    case "tier1Only":
      return rows.filter((r) => r.tier === 1);
    case "suspiciousMedia":
      return rows.filter((r) => r.flags.suspiciousMedia);
    default:
      return rows;
  }
}

export function imageStatusLabel(status: ImageStatus): string {
  switch (status) {
    case "verified":
      return "Verified photo";
    case "editorial":
      return "Editorial";
    case "genre":
      return "Genre artwork";
    case "pending-review":
      return "Awaiting verification";
    case "missing":
      return "Missing";
  }
}
