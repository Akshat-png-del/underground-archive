"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  LibraryItemType,
  PlayHistoryEntry,
  Playlist,
  PlaylistItem,
  RecentlyViewedEntry,
  UserLibraryState,
} from "@/types/library";
import {
  createDefaultState,
  getPublicPlaylists,
  isSeedPlaylist,
  loadLibraryState,
  saveLibraryState,
  SEED_PLAYLISTS,
} from "@/lib/library/store";
import {
  pruneAndHydrateLibraryState,
  resolveLibraryCoverArt,
} from "@/lib/library/resolve-display";
import { getRelease, getTrack } from "@/content/tracks";
import { getSet } from "@/content/sets";
import { getArtist } from "@/content/artists";
import { setThumbnailUrl } from "@/lib/music/set-display";
import { uid } from "@/lib/music";

interface LibraryContextValue extends UserLibraryState {
  ready: boolean;
  publicPlaylists: Playlist[];
  updateProfile: (patch: Partial<UserLibraryState["profile"]>) => void;
  createPlaylist: (data: {
    title: string;
    description?: string;
    coverImage?: string;
    isPublic?: boolean;
  }) => Playlist;
  updatePlaylist: (id: string, patch: Partial<Pick<Playlist, "title" | "description" | "coverImage" | "isPublic">>) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, type: LibraryItemType, refId: string) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
  reorderPlaylistItems: (playlistId: string, itemIds: string[]) => void;
  copyPlaylist: (sourceId: string) => Playlist | null;
  toggleSaveArtist: (slug: string) => void;
  toggleFollowArtist: (slug: string) => void;
  toggleSaveSet: (setId: string) => void;
  toggleLikeTrack: (trackId: string) => void;
  toggleLikeSet: (setId: string) => void;
  toggleLikePlaylist: (playlistId: string) => void;
  toggleFollow: (userId: string) => void;
  recordPlay: (type: LibraryItemType, refId: string) => void;
  recordView: (type: RecentlyViewedEntry["type"], refId: string) => void;
  isArtistSaved: (slug: string) => boolean;
  isArtistFollowed: (slug: string) => boolean;
  isSetSaved: (setId: string) => boolean;
  isTrackLiked: (trackId: string) => boolean;
  isSetLiked: (setId: string) => boolean;
  isPlaylistLiked: (playlistId: string) => boolean;
  isFollowing: (userId: string) => boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function resolveHistoryMeta(
  type: LibraryItemType,
  refId: string
): Pick<PlayHistoryEntry, "title" | "subtitle" | "coverArt"> | null {
  if (type === "track") {
    const track = getTrack(refId);
    if (!track) return null;
    return {
      title: track.title,
      subtitle: track.artist,
      coverArt: resolveLibraryCoverArt("track", refId),
    };
  }
  if (type === "set") {
    const set = getSet(refId);
    if (!set) return null;
    return {
      title: set.title,
      subtitle: set.artistName,
      coverArt: resolveLibraryCoverArt("set", refId),
    };
  }
  const release = getRelease(refId);
  if (!release) return null;
  return {
    title: release.title,
    subtitle: release.artist,
    coverArt: resolveLibraryCoverArt("release", refId),
  };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserLibraryState>(createDefaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(pruneAndHydrateLibraryState(loadLibraryState()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveLibraryState(state);
  }, [state, ready]);

  const mutate = useCallback((fn: (prev: UserLibraryState) => UserLibraryState) => {
    setState((prev) => fn(prev));
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<UserLibraryState["profile"]>) => {
      mutate((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
    },
    [mutate]
  );

  const createPlaylist = useCallback(
    (data: {
      title: string;
      description?: string;
      coverImage?: string;
      isPublic?: boolean;
    }): Playlist => {
      const now = new Date().toISOString();
      const playlist: Playlist = {
        id: `playlist-${uid()}`,
        title: data.title,
        description: data.description ?? "",
        coverImage: data.coverImage ?? "",
        isPublic: data.isPublic ?? false,
        creatorId: state.profile.id,
        creatorName: state.profile.displayName,
        items: [],
        likeCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      mutate((prev) => ({ ...prev, playlists: [playlist, ...prev.playlists] }));
      return playlist;
    },
    [mutate, state.profile.displayName, state.profile.id]
  );

  const updatePlaylist = useCallback(
    (id: string, patch: Partial<Pick<Playlist, "title" | "description" | "coverImage" | "isPublic">>) => {
      mutate((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
        ),
      }));
    },
    [mutate]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      mutate((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => p.id !== id) }));
    },
    [mutate]
  );

  const addToPlaylist = useCallback(
    (playlistId: string, type: LibraryItemType, refId: string) => {
      if (isSeedPlaylist(playlistId)) return;
      const item: PlaylistItem = {
        id: uid(),
        type,
        refId,
        order: 0,
        addedAt: new Date().toISOString(),
      };
      mutate((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) => {
          if (p.id !== playlistId) return p;
          if (p.items.some((i) => i.type === type && i.refId === refId)) return p;
          const order = p.items.length;
          return {
            ...p,
            items: [...p.items, { ...item, order }],
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [mutate]
  );

  const removeFromPlaylist = useCallback(
    (playlistId: string, itemId: string) => {
      mutate((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) => {
          if (p.id !== playlistId) return p;
          const items = p.items
            .filter((i) => i.id !== itemId)
            .map((i, idx) => ({ ...i, order: idx }));
          return { ...p, items, updatedAt: new Date().toISOString() };
        }),
      }));
    },
    [mutate]
  );

  const reorderPlaylistItems = useCallback(
    (playlistId: string, itemIds: string[]) => {
      mutate((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) => {
          if (p.id !== playlistId) return p;
          const map = new Map(p.items.map((i) => [i.id, i]));
          const items = itemIds
            .map((id, order) => {
              const item = map.get(id);
              return item ? { ...item, order } : null;
            })
            .filter((i): i is PlaylistItem => !!i);
          return { ...p, items, updatedAt: new Date().toISOString() };
        }),
      }));
    },
    [mutate]
  );

  const copyPlaylist = useCallback(
    (sourceId: string): Playlist | null => {
      const source =
        state.playlists.find((p) => p.id === sourceId) ??
        SEED_PLAYLISTS.find((p) => p.id === sourceId);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: Playlist = {
        ...source,
        id: `playlist-${uid()}`,
        title: `${source.title} (copy)`,
        creatorId: state.profile.id,
        creatorName: state.profile.displayName,
        likeCount: 0,
        createdAt: now,
        updatedAt: now,
        items: source.items.map((i) => ({ ...i, id: uid(), addedAt: now })),
      };
      mutate((prev) => ({ ...prev, playlists: [copy, ...prev.playlists] }));
      return copy;
    },
    [mutate, state.playlists, state.profile.displayName, state.profile.id]
  );

  const toggleInList = (key: keyof UserLibraryState, id: string) => {
    mutate((prev) => {
      const list = prev[key] as string[];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, [key]: next };
    });
  };

  const recordPlay = useCallback(
    (type: LibraryItemType, refId: string) => {
      const meta = resolveHistoryMeta(type, refId);
      if (!meta) return;
      const entry: PlayHistoryEntry = {
        id: uid(),
        type,
        refId,
        playedAt: new Date().toISOString(),
        ...meta,
      };
      mutate((prev) => ({
        ...prev,
        history: [entry, ...prev.history.filter((h) => !(h.type === type && h.refId === refId))].slice(0, 50),
      }));
    },
    [mutate]
  );

  const recordView = useCallback(
    (type: RecentlyViewedEntry["type"], refId: string) => {
      let title = refId;
      let subtitle = "";
      let coverArt = "";
      let href = "/";

      if (type === "artist") {
        const artist = getArtist(refId);
        if (!artist) return;
        title = artist.name;
        subtitle = artist.city;
        coverArt = resolveLibraryCoverArt("artist", refId);
        href = `/artists/${refId}`;
      } else if (type === "set") {
        const set = getSet(refId);
        if (!set) return;
        title = set.title;
        subtitle = set.artistName;
        coverArt = resolveLibraryCoverArt("set", refId);
        href = `/sets/${set.slug}`;
      } else if (type === "track") {
        const track = getTrack(refId);
        if (!track) return;
        title = track.title;
        subtitle = track.artist;
        coverArt = resolveLibraryCoverArt("track", refId);
        href = `/artists/${track.artistSlug}`;
      }

      const entry: RecentlyViewedEntry = {
        id: uid(),
        type,
        refId,
        title,
        subtitle,
        coverArt,
        href,
        viewedAt: new Date().toISOString(),
      };

      mutate((prev) => ({
        ...prev,
        recentlyViewed: [
          entry,
          ...prev.recentlyViewed.filter((v) => !(v.type === type && v.refId === refId)),
        ].slice(0, 30),
      }));
    },
    [mutate]
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      ...state,
      ready,
      publicPlaylists: getPublicPlaylists(state.playlists),
      updateProfile,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylistItems,
      copyPlaylist,
      toggleSaveArtist: (slug) => toggleInList("savedArtists", slug),
      toggleFollowArtist: (slug) => toggleInList("followedArtists", slug),
      toggleSaveSet: (setId) => toggleInList("savedSets", setId),
      toggleLikeTrack: (trackId) => toggleInList("likedTracks", trackId),
      toggleLikeSet: (setId) => toggleInList("likedSets", setId),
      toggleLikePlaylist: (playlistId) => toggleInList("likedPlaylists", playlistId),
      toggleFollow: (userId) => toggleInList("following", userId),
      recordPlay,
      recordView,
      isArtistSaved: (slug) => state.savedArtists.includes(slug),
      isArtistFollowed: (slug) => state.followedArtists.includes(slug),
      isSetSaved: (setId) => state.savedSets.includes(setId),
      isTrackLiked: (trackId) => state.likedTracks.includes(trackId),
      isSetLiked: (setId) => state.likedSets.includes(setId),
      isPlaylistLiked: (playlistId) => state.likedPlaylists.includes(playlistId),
      isFollowing: (userId) => state.following.includes(userId),
    }),
    [
      state,
      ready,
      updateProfile,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylistItems,
      copyPlaylist,
      recordPlay,
      recordView,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}

export function useLibraryOptional() {
  return useContext(LibraryContext);
}

/** Resolve playlist item for display */
export function resolvePlaylistItem(item: PlaylistItem) {
  if (item.type === "track") {
    const track = getTrack(item.refId);
    if (!track) return null;
    return {
      type: "track" as const,
      id: item.id,
      refId: item.refId,
      title: track.title,
      artist: track.artist,
      artistSlug: track.artistSlug,
      duration: track.duration,
      coverArt: resolveLibraryCoverArt("track", item.refId),
      spotifyUrl: track.spotifyUrl,
      youtubeUrl: track.youtubeUrl,
    };
  }
  if (item.type === "set") {
    const set = getSet(item.refId);
    if (!set) return null;
    return {
      type: "set" as const,
      id: item.id,
      refId: item.refId,
      title: set.title,
      artist: set.artistName,
      artistSlug: set.artistSlug,
      duration: set.duration ?? "",
      coverArt: setThumbnailUrl(set.thumbnail, set.youtubeId),
      youtubeId: set.youtubeId,
    };
  }
  const release = getRelease(item.refId);
  if (!release) return null;
  return {
    type: "release" as const,
    id: item.id,
    refId: item.refId,
    title: release.title,
    artist: release.artist,
    artistSlug: release.artistSlug,
    duration: "—",
    coverArt: release.coverArt,
    spotifyUrl: release.spotifyUrl,
  };
}

export function getContinueListening(history: PlayHistoryEntry[]) {
  return history.slice(0, 5);
}

export function getBecauseYouListened(history: PlayHistoryEntry[]) {
  const last = history[0];
  if (!last) return [];
  if (last.type === "track") {
    const track = getTrack(last.refId);
    if (!track) return [];
    const artist = getArtist(track.artistSlug);
    if (!artist) return [];
    return artist.similarArtists
      .map((s) => getArtist(s))
      .filter(Boolean)
      .slice(0, 4);
  }
  return [];
}
