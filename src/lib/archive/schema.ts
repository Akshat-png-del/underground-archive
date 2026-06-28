import type {
  Artist,
  EssentialSet,
  ExternalLinks,
  Track,
  VerificationStatus,
} from "@/types";

/** Canonical artist fields required for archive integrity. */
export interface CanonicalArtistFields {
  id: string;
  slug: string;
  name: string;
  country: string;
  genres: Artist["genres"];
  labels: string[];
  verificationStatus: VerificationStatus;
  spotifyArtistId?: string;
  imageSource: "editorial" | "fallback";
  externalLinks: ExternalLinks;
  topTracks: Track[];
  essentialSets: EssentialSet[];
  similarArtists: string[];
}

export const FALLBACK_IMAGE = "/images/artist-fallback.svg";
