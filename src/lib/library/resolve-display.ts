import { getArtist } from "@/content/artists";
import { getSet } from "@/content/sets";
import { getRelease, getTrack } from "@/content/tracks";
import { resolveHeroImage } from "@/lib/archive/verification";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { IMAGE_FALLBACK } from "@/lib/images";
import { isGenericArtworkFallback } from "@/lib/music/track-artwork";
import { setThumbnailUrl } from "@/lib/music/set-display";
import type {
  LibraryItemType,
  PlayHistoryEntry,
  Playlist,
  RecentlyViewedEntry,
  UserLibraryState,
} from "@/types/library";

/** True for genre SVGs, artist-fallback, empty, or other non-verified display assets. */
export function isPlaceholderArtwork(url?: string | null): boolean {
  if (!url?.trim()) return true;
  const u = url.trim();
  if (u === FALLBACK_IMAGE || u === IMAGE_FALLBACK) return true;
  if (u.includes("artist-fallback")) return true;
  if (u.includes("/images/genres/")) return true;
  if (u.includes("hero-atmospheric")) return true;
  return false;
}

function firstVerifiedSpotifyArt(url?: string | null): string {
  if (!url?.trim() || isGenericArtworkFallback(url)) return "";
  return url.trim();
}

/**
 * Live artwork for a library ref.
 * Priority: set thumbnail → artist hero → release art → track art.
 * Never invents placeholders. Empty string = hide artwork in UI.
 */
export function resolveLibraryCoverArt(
  type: LibraryItemType | RecentlyViewedEntry["type"],
  refId: string,
): string {
  if (type === "set") {
    const set = getSet(refId);
    if (!set) return "";
    const thumb = setThumbnailUrl(set.thumbnail, set.youtubeId);
    return isPlaceholderArtwork(thumb) ? "" : thumb;
  }

  if (type === "track") {
    const track = getTrack(refId);
    if (!track) return "";
    const fromTrack = firstVerifiedSpotifyArt(track.coverArt);
    if (fromTrack) return fromTrack;
    // Verified artist portrait/hero when track has no Spotify cover
    const artist = getArtist(track.artistSlug);
    if (artist) {
      const portrait = resolveHeroImage(artist);
      if (portrait && !isPlaceholderArtwork(portrait) && !isGenericArtworkFallback(portrait)) {
        return portrait;
      }
    }
    return resolveArtistLibraryArt(track.artistSlug);
  }

  if (type === "release") {
    const release = getRelease(refId);
    if (!release) return "";
    const fromRelease = firstVerifiedSpotifyArt(release.coverArt);
    if (fromRelease) return fromRelease;
    return resolveArtistLibraryArt(release.artistSlug);
  }

  if (type === "artist") {
    return resolveArtistLibraryArt(refId);
  }

  return "";
}

/** Artist library art: set thumb → hero → release → track (never portrait placeholders). */
function resolveArtistLibraryArt(slug: string): string {
  const artist = getArtist(slug);
  if (!artist) return "";

  // 1. verified set thumbnail
  for (const set of artist.essentialSets) {
    const thumb = setThumbnailUrl(undefined, set.youtubeId);
    if (thumb && !isPlaceholderArtwork(thumb)) return thumb;
  }

  // 2. verified artist hero (same resolver as artist pages / heroes)
  const hero = resolveHeroImage(artist);
  if (hero && !isPlaceholderArtwork(hero)) return hero;

  // 3. verified release artwork
  for (const release of [...artist.albums, ...artist.eps, ...artist.singles]) {
    const art = firstVerifiedSpotifyArt(release.coverArt);
    if (art) return art;
  }

  // 4. verified track artwork
  for (const track of artist.topTracks) {
    const art = firstVerifiedSpotifyArt(track.coverArt);
    if (art) return art;
  }

  return "";
}

export function libraryRefExists(
  type: LibraryItemType | RecentlyViewedEntry["type"],
  refId: string,
): boolean {
  if (type === "track") return !!getTrack(refId);
  if (type === "set") return !!getSet(refId);
  if (type === "artist") return !!getArtist(refId);
  if (type === "release") return !!getRelease(refId);
  return false;
}

/** Refresh stored history rows from live catalog; drop orphans. */
export function hydrateHistoryEntry(entry: PlayHistoryEntry): PlayHistoryEntry | null {
  if (!libraryRefExists(entry.type, entry.refId)) return null;

  let title = entry.title;
  let subtitle = entry.subtitle;
  const coverArt = resolveLibraryCoverArt(entry.type, entry.refId);

  if (entry.type === "track") {
    const track = getTrack(entry.refId)!;
    title = track.title;
    subtitle = track.artist;
  } else if (entry.type === "set") {
    const set = getSet(entry.refId)!;
    title = set.title;
    subtitle = set.artistName;
  } else if (entry.type === "release") {
    const release = getRelease(entry.refId)!;
    title = release.title;
    subtitle = release.artist;
  }

  if (!title?.trim()) return null;

  return { ...entry, title, subtitle, coverArt };
}

export function hydrateRecentlyViewedEntry(
  entry: RecentlyViewedEntry,
): RecentlyViewedEntry | null {
  if (!libraryRefExists(entry.type, entry.refId)) return null;

  let title = entry.title;
  let subtitle = entry.subtitle;
  let href = entry.href;
  const coverArt = resolveLibraryCoverArt(entry.type, entry.refId);

  if (entry.type === "artist") {
    const artist = getArtist(entry.refId)!;
    title = artist.name;
    subtitle = artist.city;
    href = `/artists/${entry.refId}`;
  } else if (entry.type === "set") {
    const set = getSet(entry.refId)!;
    title = set.title;
    subtitle = set.artistName;
    href = `/sets/${set.slug}`;
  } else if (entry.type === "track") {
    const track = getTrack(entry.refId)!;
    title = track.title;
    subtitle = track.artist;
    href = `/artists/${track.artistSlug}`;
  }

  if (!title?.trim()) return null;

  return { ...entry, title, subtitle, coverArt, href };
}

/**
 * Ordered cover candidates for a playlist.
 * Dedicated atmospheric coverImage wins; track album art is fallback only
 * when no dedicated hero exists (never preferred over playlist heroes).
 */
export function playlistCoverCandidates(playlist: Playlist): string[] {
  const dedicated: string[] = [];
  const fallbacks: string[] = [];

  const push = (bucket: string[], url?: string | null) => {
    if (!url || isPlaceholderArtwork(url)) return;
    const trimmed = url.trim();
    if (dedicated.includes(trimmed) || fallbacks.includes(trimmed) || bucket.includes(trimmed)) {
      return;
    }
    bucket.push(trimmed);
  };

  const stored = playlist.coverImage?.trim();
  if (stored && !isPlaceholderArtwork(stored)) {
    // Local playlist heroes and any non-Spotify dedicated cover take priority.
    const isSpotifyAlbumArt =
      stored.includes("scdn.co") || stored.includes("spotifycdn.com");
    if (!isSpotifyAlbumArt) {
      push(dedicated, stored);
    } else {
      push(fallbacks, stored);
    }
  }

  for (const item of playlist.items) {
    if (!libraryRefExists(item.type, item.refId)) continue;
    if (item.type === "track") {
      push(fallbacks, firstVerifiedSpotifyArt(getTrack(item.refId)?.coverArt));
    } else if (item.type === "release") {
      push(fallbacks, firstVerifiedSpotifyArt(getRelease(item.refId)?.coverArt));
    } else if (item.type === "set") {
      push(fallbacks, resolveLibraryCoverArt("set", item.refId));
    }
  }

  // Prefer dedicated atmospheric heroes; only use catalog art if none exist.
  return dedicated.length > 0 ? dedicated : fallbacks;
}

/** Primary display cover — first valid candidate, or empty when none exist. */
export function resolvePlaylistCoverImage(playlist: Playlist): string {
  return playlistCoverCandidates(playlist)[0] ?? "";
}

/** Ensure coverImage is a real artwork URL when items have cover art. */
export function hydratePlaylistCover(playlist: Playlist): Playlist {
  const coverImage = resolvePlaylistCoverImage(playlist);
  if (coverImage === (playlist.coverImage ?? "").trim()) return playlist;
  return { ...playlist, coverImage };
}

function prunePlaylist(playlist: Playlist): Playlist {
  const items = playlist.items.filter((item) => libraryRefExists(item.type, item.refId));
  return hydratePlaylistCover({
    ...playlist,
    items: items.map((item, order) => ({ ...item, order })),
  });
}

/** Drop orphan saved/liked/history refs and refresh artwork from the live catalog. */
export function pruneAndHydrateLibraryState(state: UserLibraryState): UserLibraryState {
  return {
    ...state,
    savedArtists: state.savedArtists.filter((slug) => !!getArtist(slug)),
    followedArtists: state.followedArtists.filter((slug) => !!getArtist(slug)),
    savedSets: state.savedSets.filter((id) => !!getSet(id)),
    likedTracks: state.likedTracks.filter((id) => !!getTrack(id)),
    likedSets: state.likedSets.filter((id) => !!getSet(id)),
    history: state.history
      .map(hydrateHistoryEntry)
      .filter((h): h is PlayHistoryEntry => !!h),
    recentlyViewed: state.recentlyViewed
      .map(hydrateRecentlyViewedEntry)
      .filter((v): v is RecentlyViewedEntry => !!v),
    playlists: state.playlists.map(prunePlaylist),
  };
}
