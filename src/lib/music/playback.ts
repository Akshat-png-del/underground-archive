import type { ArchiveSet, CatalogRelease, CatalogTrack } from "@/types/library";
import type { LibraryItemType } from "@/types/library";
import { getRelease, getTrack } from "@/content/tracks";
import { getSet } from "@/content/sets";
import { trackId } from "@/lib/music";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
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
  detailsHref?: string;
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
    detailsHref: `/artists/${track.artistSlug}#track-${id}`,
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
      coverArt: set?.thumbnail,
      spotifyUrl,
      youtubeUrl,
      youtubeId: youtubeId ?? set?.youtubeId,
      detailsHref: set ? `/sets/${set.slug}` : undefined,
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
    detailsHref: release ? `/artists/${release.artistSlug}#releases` : undefined,
  };
}

export function playbackItemFromSet(set: ArchiveSet): PlaybackItem {
  return {
    type: "set",
    refId: set.id,
    label: `${set.title} — ${set.artistName}`,
    title: set.title,
    subtitle: set.artistName,
    coverArt: set.thumbnail,
    youtubeId: set.youtubeId,
    detailsHref: `/sets/${set.slug}`,
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
    detailsHref: `/artists/${release.artistSlug}#release-${release.id}`,
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
