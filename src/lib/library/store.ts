import type { Playlist, UserLibraryState, UserProfile } from "@/types/library";
import { uid } from "@/lib/music";
import { SEED_PLAYLISTS } from "@/lib/library/seed-playlists.generated";

/** Bumped to invalidate stale localStorage that overrode seed playlists with thin mocks. */
const STORAGE_KEY = "underground-archive-library-v2";

export { SEED_PLAYLISTS };

if (
  process.env.NODE_ENV !== "production" &&
  (SEED_PLAYLISTS.length < 6 || SEED_PLAYLISTS.length > 10)
) {
  throw new Error(
    `SEED_PLAYLISTS integration broken: expected 6–10 curated playlists, got ${SEED_PLAYLISTS.length}`,
  );
}

export const DEMO_USERS: UserProfile[] = [
  { id: "user-demo-1", displayName: "warehouse_ghost", bio: "Hard techno only. No photos on the dancefloor." },
  { id: "user-demo-2", displayName: "schranz_gym", bio: "Loop-driven workouts and Berlin energy." },
  { id: "user-demo-3", displayName: "industrial_dawn", bio: "EBM, darkwave, and factory-floor techno." },
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
    const playlists = (parsed.playlists ?? []).filter((p) => !isSeedPlaylist(p.id));
    return {
      ...createDefaultState(),
      ...parsed,
      profile: { ...defaultProfile(), ...parsed.profile },
      playlists,
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

/**
 * Public catalog = seed playlists (source of truth) + user public playlists.
 * Seed IDs always win — never allow thin localStorage mocks to override.
 */
export function getPublicPlaylists(userPlaylists: Playlist[]): Playlist[] {
  const byId = new Map<string, Playlist>();
  for (const p of userPlaylists) {
    if (!p.isPublic || isSeedPlaylist(p.id)) continue;
    byId.set(p.id, p);
  }
  for (const p of SEED_PLAYLISTS) {
    byId.set(p.id, p);
  }
  return [...byId.values()].sort(
    (a, b) => b.likeCount - a.likeCount || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getPlaylistById(id: string, userPlaylists: Playlist[]): Playlist | undefined {
  if (isSeedPlaylist(id)) {
    return SEED_PLAYLISTS.find((p) => p.id === id);
  }
  return userPlaylists.find((p) => p.id === id);
}

export function isSeedPlaylist(id: string): boolean {
  return SEED_PLAYLISTS.some((p) => p.id === id);
}
