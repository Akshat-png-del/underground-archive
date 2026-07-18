import type { Genre } from "./index";

export type SetCategory =
  | "boiler-room"
  | "hor-berlin"
  | "intercell"
  | "possession"
  | "teletech"
  | "awakenings"
  | "stone-techno"
  | "verknipt"
  | "vault-sessions"
  | "kntxt"
  | "festival-sets"
  | "warehouse-sessions";

export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  artistId: string;
  verified: boolean;
  duration: string;
  releaseYear: number;
  coverArt: string;
  spotifyUrl: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  previewUrl?: string;
}

export interface CatalogRelease {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  year: number;
  coverArt: string;
  label?: string;
  spotifyUrl?: string;
  type: "album" | "ep" | "single";
}

export interface ArchiveSet {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistId: string;
  verified: boolean;
  event: string;
  category: SetCategory;
  date: string;
  /** Real set length when known. Never invent (e.g. do not hardcode 1:00:00). */
  duration?: string;
  youtubeId: string;
  genres: Genre[];
  bpm?: number;
  energy?: number;
  location: string;
  thumbnail: string;
}

export type LibraryItemType = "track" | "set" | "release";

export interface PlaylistItem {
  id: string;
  type: LibraryItemType;
  refId: string;
  order: number;
  addedAt: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  isPublic: boolean;
  creatorId: string;
  creatorName: string;
  items: PlaylistItem[];
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecentlyViewedEntry {
  id: string;
  type: LibraryItemType | "artist";
  refId: string;
  title: string;
  subtitle: string;
  coverArt: string;
  href: string;
  viewedAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export interface PlayHistoryEntry {
  id: string;
  type: LibraryItemType;
  refId: string;
  title: string;
  subtitle: string;
  coverArt: string;
  playedAt: string;
}

export interface UserLibraryState {
  profile: UserProfile;
  playlists: Playlist[];
  savedArtists: string[];
  followedArtists: string[];
  savedSets: string[];
  likedTracks: string[];
  likedSets: string[];
  likedPlaylists: string[];
  following: string[];
  history: PlayHistoryEntry[];
  recentlyViewed: RecentlyViewedEntry[];
}

export type SearchResultType = "artist" | "track" | "set" | "genre" | "editorial";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
}
