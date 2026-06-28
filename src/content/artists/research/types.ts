import type { Genre, ImageSourceType, VerificationStatus } from "@/types";
import type { VerifiedImageSource } from "@/types";
import type { ImageCrossChecks } from "@/lib/archive/images/types";

/** Minimum confidence required before a field is published. */
export const RESEARCH_CONFIDENCE_THRESHOLD = 0.95;

export interface VerifiedField<T> {
  value: T;
  confidence: number;
  verifiedAt?: string;
  source?: string;
}

export interface ResearchSpotifyProfile {
  artistId: string;
  url: string;
  confidence: number;
}

export interface ResearchExternalUrl {
  url: string;
  confidence: number;
}

export interface ResearchImage {
  url: string;
  source: VerifiedImageSource;
  sourceType?: ImageSourceType;
  /** Canonical source page URL */
  imageSource?: string;
  confidence: number;
  attribution?: string;
  lastVerifiedAt?: string;
  crossChecks?: ImageCrossChecks;
}

export interface ResearchTrack {
  title: string;
  spotifyTrackId: string;
  year: number;
  duration: string;
  confidence: number;
}

export interface ResearchSet {
  title: string;
  venue: string;
  year: number;
  youtubeId: string;
  confidence: number;
}

/** Editorial research record — single source of truth for verified artist media. */
export interface ArtistResearchRecord {
  slug: string;
  name: string;
  country: string;
  genres: Genre[];
  verificationStatus: VerificationStatus;
  spotify?: ResearchSpotifyProfile;
  instagram?: ResearchExternalUrl;
  soundcloud?: ResearchExternalUrl;
  youtube?: ResearchExternalUrl;
  residentAdvisor?: ResearchExternalUrl;
  website?: ResearchExternalUrl;
  image?: ResearchImage;
  tracks?: ResearchTrack[];
  sets?: ResearchSet[];
}

export function fieldVerified(confidence: number): boolean {
  return confidence >= RESEARCH_CONFIDENCE_THRESHOLD;
}
