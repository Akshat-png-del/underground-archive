export type Genre =
  | "hard-techno"
  | "schranz"
  | "industrial-techno"
  | "dark-techno"
  | "peak-time-techno"
  | "ebm"
  | "industrial-ebm"
  | "darkwave"
  | "post-punk"
  | "industrial"
  | "acid-techno"
  | "hardgroove"
  | "hypnotic-techno";

export type MoodTag =
  | "aggressive"
  | "hypnotic"
  | "dark"
  | "euphoric"
  | "industrial"
  | "melancholic"
  | "apocalyptic"
  | "fast-paced";

export type VerificationStatus = "verified" | "partial" | "unverified";

/** Editorial curation tier (1 = flagship, 2 = extended, 3 = directory). */
export type CurationTier = 1 | 2 | 3;

export type ImageSource = "editorial" | "fallback";

export type VerifiedImageSource =
  | "official-website"
  | "instagram"
  | "spotify"
  | "label-press"
  | "festival-press"
  | "fallback";

/** Official portrait source classification (priority-ordered in image pipeline). */
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

export interface ArtistImage {
  url: string;
  source: VerifiedImageSource;
  sourceType: ImageSourceType;
  verified: boolean;
  /** Canonical page URL where the photograph was sourced */
  imageSource?: string;
  attribution?: string;
  lastVerifiedAt?: string;
  /** Set when image cannot be verified — do not substitute another artist */
  reviewReason?: string;
}

export interface ExternalLinks {
  spotify?: string;
  soundcloud?: string;
  instagram?: string;
  residentAdvisor?: string;
  youtube?: string;
}

export interface Track {
  id: string;
  artistId: string;
  verified: boolean;
  title: string;
  year: number;
  duration: string;
  coverArt: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export interface Release {
  title: string;
  year: number;
  coverArt: string;
  label?: string;
  spotifyUrl?: string;
}

export interface SoundScores {
  energy: number;
  darkness: number;
  aggression: number;
  industrial: number;
  melody: number;
}

export interface EssentialSet {
  id: string;
  artistId: string;
  verified: boolean;
  title: string;
  venue: string;
  year: number;
  youtubeId: string;
}

export interface ListeningPathStep {
  type: "track" | "ep" | "set" | "album";
  title: string;
  note?: string;
}

export interface EditorialBio {
  origins: string;
  earlyCareer: string;
  breakthrough: string;
  soundEvolution: string;
  presentDay: string;
}

export interface CommunityRatings {
  energy: number;
  darkness: number;
  intensity: number;
  innovation: number;
  dancefloorImpact: number;
  count: number;
}

export interface Artist {
  id: string;
  slug: string;
  name: string;
  portrait: string;
  heroImage: string;
  image: ArtistImage;
  curationTier: CurationTier;
  verificationStatus: VerificationStatus;
  spotifyArtistId?: string;
  imageSource: ImageSource;
  country: string;
  city: string;
  scene: string;
  activeSince: number;
  genres: Genre[];
  labels: string[];
  collectives: string[];
  externalLinks: ExternalLinks;
  bpmRange: [number, number];
  soundScores: SoundScores;
  moodTags: MoodTag[];
  editorialBio: EditorialBio;
  signatureSound: {
    productionStyle: string;
    atmosphere: string;
    influences: string[];
  };
  topTracks: Track[];
  albums: Release[];
  eps: Release[];
  singles: Release[];
  essentialSets: EssentialSet[];
  listeningPath: ListeningPathStep[];
  similarArtists: string[];
  careerTimeline: { year: number; event: string }[];
  ratings: CommunityRatings;
  visualIdentity?: string;
  featured?: boolean;
  trending?: boolean;
  spotlight?: boolean;
}

export type ArchiveCategory =
  | "scene-histories"
  | "artist-essays"
  | "label-histories"
  | "club-histories"
  | "essential-sets"
  | "cultural-essays"
  | "interviews"
  | "scene-reports"
  | "music-analysis"
  | "culture-essays"
  | "artist-spotlights";

export interface EditorialArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: ArchiveCategory;
  heroImage: string;
  author: string;
  publishedAt: string;
  readTime: number;
  content: string;
  featured?: boolean;
  relatedGenres?: Genre[];
}

export interface DiscoveryFilters {
  genre?: Genre;
  mood?: MoodTag;
  energy?: number;
  darkness?: number;
  bpmMin?: number;
  bpmMax?: number;
  country?: string;
  label?: string;
  era?: string;
  preset?: string;
}
