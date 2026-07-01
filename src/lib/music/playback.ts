import type { ArchiveSet, CatalogRelease, CatalogTrack } from "@/types/library";
import type { LibraryItemType } from "@/types/library";
import { getRelease, getTrack } from "@/content/tracks";
import { getSet } from "@/content/sets";
import { trackId } from "@/lib/music";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { setThumbnailUrl } from "@/lib/music/set-display";
import {
  enrichTrackItemSources,
  logTrackSourceResolution,
  normalizeCatalogTrackSources,
} from "@/lib/music/track-source";

export interface PlaybackItem {
  type: LibraryItemType;
  refId: string;
  label: string;
  title: string;
  subtitle: string;
  coverArt?: string;
  spotifyUrl?: string;
  spotifyTrackId?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  previewUrl?: string;
}

export function playbackItemFromTrack(track: CatalogTrack): PlaybackItem {
  const id = track.id || trackId(track.artistSlug, track.title);
  const sources = normalizeCatalogTrackSources(track);
  return {
    type: "track",
    refId: id,
    label: `${track.title} — ${track.artist}`,
    title: track.title,
    subtitle: track.artist,
    coverArt: track.coverArt,
    spotifyUrl: sources.spotifyUrl,
    spotifyTrackId: sources.spotifyTrackId,
    youtubeUrl: sources.youtubeUrl,
    previewUrl: sources.previewUrl,
  };
}

export function playbackItemFromMusicActions(props: {
  type: LibraryItemType;
  refId: string;
  label: string;
  spotifyUrl?: string;
  spotifyTrackId?: string;
  youtubeUrl?: string;
  youtubeId?: string;
}): PlaybackItem {
  const { type, refId, label, spotifyUrl, spotifyTrackId, youtubeUrl, youtubeId } = props;

  if (type === "track") {
    const track = getTrack(refId);
    if (track) return playbackItemFromTrack(track);
    const sources = enrichTrackItemSources(refId, {
      spotifyUrl,
      spotifyTrackId,
      youtubeUrl,
      youtubeId,
    });
    const [title, artist] = label.split(" — ");
    logTrackSourceResolution({ refId, spotifyUrl, spotifyTrackId, youtubeUrl }, sources, {
      url: sources.spotifyUrl ?? sources.youtubeUrl ?? null,
      issue: sources.spotifyUrl || sources.youtubeUrl ? null : "Track not in catalog and no URL props",
      failureLine: sources.spotifyUrl || sources.youtubeUrl ? undefined : "playback.ts:playbackItemFromMusicActions fallback",
    });
    return {
      type,
      refId,
      label,
      title: title ?? label,
      subtitle: artist ?? "",
      spotifyUrl: sources.spotifyUrl,
      spotifyTrackId: sources.spotifyTrackId,
      youtubeUrl: sources.youtubeUrl,
      youtubeId: sources.youtubeId,
    };
  }

  if (type === "set") {
    const set = getSet(refId);
    return {
      type,
      refId,
      label,
      title: set?.title ?? label,
      subtitle: set?.artistName ?? "",
      coverArt: set?.thumbnail
        ? set.thumbnail
        : setThumbnailUrl(undefined, youtubeId ?? set?.youtubeId) || undefined,
      spotifyUrl,
      youtubeUrl,
      youtubeId: youtubeId ?? set?.youtubeId,
    };
  }

  const release = getRelease(refId);
  return {
    type,
    refId,
    label,
    title: release?.title ?? label,
    subtitle: release?.artist ?? "",
    coverArt: release?.coverArt,
    spotifyUrl: release?.spotifyUrl ?? spotifyUrl,
  };
}

export function playbackItemFromSet(set: ArchiveSet): PlaybackItem {
  return {
    type: "set",
    refId: set.id,
    label: `${set.title} — ${set.artistName}`,
    title: set.title,
    subtitle: set.artistName,
    coverArt: setThumbnailUrl(set.thumbnail, set.youtubeId) || undefined,
    youtubeId: set.youtubeId,
  };
}

export function playbackItemFromRelease(release: CatalogRelease): PlaybackItem {
  return {
    type: "release",
    refId: release.id,
    label: `${release.title} — ${release.artist}`,
    title: release.title,
    subtitle: release.artist,
    coverArt: release.coverArt,
    spotifyUrl: release.spotifyUrl,
  };
}

export function playbackItemFromRef(type: LibraryItemType, refId: string): PlaybackItem | null {
  if (type === "track") {
    const track = getTrack(refId);
    return track ? playbackItemFromTrack(track) : null;
  }
  if (type === "set") {
    const set = getSet(refId);
    return set ? playbackItemFromSet(set) : null;
  }
  const release = getRelease(refId);
  return release ? playbackItemFromRelease(release) : null;
}

export function buildPlaybackEmbedUrl(item: PlaybackItem, autoplay = true): string | null {
  const resolved = resolvePlaybackSource(item, autoplay);
  return resolved.embedUrl;
}

export function isSamePlaybackItem(a: PlaybackItem | null, b: PlaybackItem): boolean {
  return !!a && a.type === b.type && a.refId === b.refId;
}

/** List the user is browsing — next/previous walk this queue, not play history. */
export type PlaybackBrowseContext = {
  queue: PlaybackItem[];
  queueIndex: number;
};

export function browseContextAt(
  queue: PlaybackItem[],
  item: PlaybackItem,
  index?: number,
): PlaybackBrowseContext {
  if (index !== undefined && index >= 0 && index < queue.length) {
    return { queue, queueIndex: index };
  }
  const queueIndex = queue.findIndex((entry) => isSamePlaybackItem(entry, item));
  return { queue, queueIndex: queueIndex >= 0 ? queueIndex : 0 };
}

/** YouTube-backed items — video mode (native embed controls, no GlobalPlayer transport). */
export function isVideoPlaybackItem(item: PlaybackItem): boolean {
  return resolvePlaybackSource(item).kind === "youtube";
}
