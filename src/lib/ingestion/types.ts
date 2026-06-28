/** Locally cached API metadata per artist — written by sync scripts. */
export interface IngestionSourceMeta {
  syncedAt: string;
  status: "ok" | "skipped" | "error";
  error?: string;
}

export interface SpotifyIngested {
  artistId: string;
  name: string;
  url: string;
  genres: string[];
  followers: number;
  popularity: number;
  imageUrl: string | null;
  imageUrls: string[];
  relatedArtists: {
    id: string;
    name: string;
  }[];
}

export interface YoutubeIngested {
  channelId: string | null;
  channelTitle: string | null;
  channelUrl: string | null;
  customUrl: string | null;
  thumbnailUrl: string | null;
}

export interface MusicBrainzIngested {
  mbid: string;
  name: string;
  country: string | null;
  disambiguation: string | null;
  imageUrl: string | null;
}

export interface DiscogsIngested {
  id: number;
  name: string;
  profile: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  uri: string | null;
}

export type IngestedPortraitSource =
  | "spotify"
  | "discogs"
  | "beatport"
  | "resident-advisor"
  | "official-website"
  | "musicbrainz"
  | "youtube";

export interface ResolvedIngestedImage {
  url: string;
  source: IngestedPortraitSource;
  sourceUrl: string;
}

export interface ArtistIngestedMetadata {
  slug: string;
  name: string;
  updatedAt: string;
  sources: {
    spotify?: IngestionSourceMeta;
    youtube?: IngestionSourceMeta;
    musicbrainz?: IngestionSourceMeta;
    discogs?: IngestionSourceMeta;
    beatport?: IngestionSourceMeta;
    residentAdvisor?: IngestionSourceMeta;
    website?: IngestionSourceMeta;
  };
  spotify?: SpotifyIngested;
  youtube?: YoutubeIngested;
  musicbrainz?: MusicBrainzIngested;
  discogs?: DiscogsIngested;
  resolvedImage?: ResolvedIngestedImage;
  /** Spotify related artist IDs mapped to archive slugs when possible */
  relatedArtistSlugs?: string[];
}

export interface IngestionManifest {
  version: number;
  lastFullSync: string | null;
  artistCount: number;
}

export type IngestionProvider = "spotify" | "youtube" | "musicbrainz" | "discogs";

export interface ArtistSeed {
  slug: string;
  name: string;
  spotifyArtistId?: string;
  country?: string;
}
