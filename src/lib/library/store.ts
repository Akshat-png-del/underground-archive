import type { Playlist, UserLibraryState, UserProfile } from "@/types/library";
import { uid } from "@/lib/music";

const STORAGE_KEY = "underground-archive-library-v1";

export const DEMO_USERS: UserProfile[] = [
  { id: "user-demo-1", displayName: "warehouse_ghost", bio: "Hard techno only. No photos on the dancefloor." },
  { id: "user-demo-2", displayName: "schranz_gym", bio: "Loop-driven workouts and Berlin energy." },
  { id: "user-demo-3", displayName: "industrial_dawn", bio: "EBM, darkwave, and factory-floor techno." },
];

export const SEED_PLAYLISTS: Playlist[] = [
  {
    id: "playlist-seed-1",
    title: "My Hard Techno Essentials",
    description: "Peak-time warehouse weapons for the 4am crowd.",
    coverImage: "https://img.youtube.com/vi/EIQlDpgAY5Y/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 284,
    createdAt: "2025-01-10T12:00:00Z",
    updatedAt: "2025-03-01T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "sara-landry::legacy", order: 0, addedAt: "2025-01-10T12:00:00Z" },
      { id: uid(), type: "track", refId: "i-hate-models::intergalactic-emotional-breakdown", order: 1, addedAt: "2025-01-10T12:00:00Z" },
      { id: uid(), type: "set", refId: "kobosil::boiler-room-berlin", order: 2, addedAt: "2025-01-11T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-2",
    title: "Schranz Gym Playlist",
    description: "Relentless loops for heavy lifting sessions.",
    coverImage: "https://img.youtube.com/vi/E4lxtEzoQ3c/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-2",
    creatorName: "schranz_gym",
    likeCount: 156,
    createdAt: "2025-02-01T12:00:00Z",
    updatedAt: "2025-02-15T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "kobosil::intimacy-one", order: 0, addedAt: "2025-02-01T12:00:00Z" },
      { id: uid(), type: "set", refId: "regal::boiler-room-madrid-mondo-disko-xix", order: 1, addedAt: "2025-02-01T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-3",
    title: "Industrial Darkness",
    description: "EBM-infused techno and cold-wave energy.",
    coverImage: "https://img.youtube.com/vi/8CT6HxYA0cg/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-3",
    creatorName: "industrial_dawn",
    likeCount: 98,
    createdAt: "2025-03-05T12:00:00Z",
    updatedAt: "2025-03-20T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "boy-harsher::pain", order: 0, addedAt: "2025-03-05T12:00:00Z" },
      { id: uid(), type: "track", refId: "i-hate-models::two-steps-from-heaven", order: 1, addedAt: "2025-03-05T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-4",
    title: "My Schranz Essentials",
    description: "Loop-driven weapons for the 4am shift change.",
    coverImage: "https://img.youtube.com/vi/E4lxtEzoQ3c/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-2",
    creatorName: "schranz_gym",
    likeCount: 312,
    createdAt: "2025-04-01T12:00:00Z",
    updatedAt: "2025-05-10T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "kobosil::intimacy-one", order: 0, addedAt: "2025-04-01T12:00:00Z" },
      { id: uid(), type: "set", refId: "regal::boiler-room-madrid-mondo-disko-xix", order: 1, addedAt: "2025-04-01T12:00:00Z" },
      { id: uid(), type: "track", refId: "sara-landry::legacy", order: 2, addedAt: "2025-04-02T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-5",
    title: "My Darkwave Collection",
    description: "Cold synths and gothic drive for after-hours.",
    coverImage: "https://img.youtube.com/vi/8CT6HxYA0cg/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-3",
    creatorName: "industrial_dawn",
    likeCount: 187,
    createdAt: "2025-04-15T12:00:00Z",
    updatedAt: "2025-06-01T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "boy-harsher::pain", order: 0, addedAt: "2025-04-15T12:00:00Z" },
      { id: uid(), type: "track", refId: "i-hate-models::intergalactic-emotional-breakdown", order: 1, addedAt: "2025-04-15T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-6",
    title: "Warehouse Energy Playlist",
    description: "Peak-time pressure from open to close.",
    coverImage: "https://img.youtube.com/vi/EIQlDpgAY5Y/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 421,
    createdAt: "2025-05-01T12:00:00Z",
    updatedAt: "2025-06-15T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "sara-landry::legacy", order: 0, addedAt: "2025-05-01T12:00:00Z" },
      { id: uid(), type: "set", refId: "kobosil::boiler-room-berlin", order: 1, addedAt: "2025-05-01T12:00:00Z" },
      { id: uid(), type: "track", refId: "i-hate-models::two-steps-from-heaven", order: 2, addedAt: "2025-05-02T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-7",
    title: "Berlin Night Drive",
    description: "Autobahn intensity — industrial techno for empty streets.",
    coverImage: "https://img.youtube.com/vi/E4lxtEzoQ3c/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 267,
    createdAt: "2025-05-20T12:00:00Z",
    updatedAt: "2025-06-20T12:00:00Z",
    items: [
      { id: uid(), type: "set", refId: "kobosil::boiler-room-berlin", order: 0, addedAt: "2025-05-20T12:00:00Z" },
      { id: uid(), type: "track", refId: "kobosil::intimacy-one", order: 1, addedAt: "2025-05-20T12:00:00Z" },
    ],
  },
  {
    id: "playlist-seed-8",
    title: "Peak Time Chaos",
    description: "Maximum energy for the moment the room ignites.",
    coverImage: "https://img.youtube.com/vi/EIQlDpgAY5Y/hqdefault.jpg",
    isPublic: true,
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 512,
    createdAt: "2025-06-01T12:00:00Z",
    updatedAt: "2025-06-20T12:00:00Z",
    items: [
      { id: uid(), type: "track", refId: "sara-landry::legacy", order: 0, addedAt: "2025-06-01T12:00:00Z" },
      { id: uid(), type: "track", refId: "hadone::angel-numbers", order: 1, addedAt: "2025-06-01T12:00:00Z" },
      { id: uid(), type: "set", refId: "vtss::boiler-room-x-dekmantel-festival-2022", order: 2, addedAt: "2025-06-02T12:00:00Z" },
    ],
  },
];

function defaultProfile(): UserProfile {
  return {
    id: `user-${uid()}`,
    displayName: "listener",
    bio: "",
  };
}

export function createDefaultState(): UserLibraryState {
  return {
    profile: defaultProfile(),
    playlists: [],
    savedArtists: [],
    followedArtists: [],
    savedSets: [],
    likedTracks: [],
    likedSets: [],
    likedPlaylists: [],
    following: [],
    history: [],
    recentlyViewed: [],
  };
}

export function loadLibraryState(): UserLibraryState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as UserLibraryState;
    return {
      ...createDefaultState(),
      ...parsed,
      profile: { ...defaultProfile(), ...parsed.profile },
      followedArtists: parsed.followedArtists ?? [],
      recentlyViewed: parsed.recentlyViewed ?? [],
    };
  } catch {
    return createDefaultState();
  }
}

export function saveLibraryState(state: UserLibraryState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getPublicPlaylists(userPlaylists: Playlist[]): Playlist[] {
  const publicUser = userPlaylists.filter((p) => p.isPublic);
  const merged = [...SEED_PLAYLISTS, ...publicUser];
  const byId = new Map(merged.map((p) => [p.id, p]));
  return [...byId.values()].sort(
    (a, b) => b.likeCount - a.likeCount || b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getPlaylistById(id: string, userPlaylists: Playlist[]): Playlist | undefined {
  return userPlaylists.find((p) => p.id === id) ?? SEED_PLAYLISTS.find((p) => p.id === id);
}

export function isSeedPlaylist(id: string): boolean {
  return SEED_PLAYLISTS.some((p) => p.id === id);
}
