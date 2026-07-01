import { useMemo } from "react";
import type { PlaybackItem } from "@/lib/music/playback";
import { getSet } from "@/content/sets";
import { getTrack, getRelease } from "@/content/tracks";
import { getArtist, genreLabels } from "@/content/artists";

export interface NowPlayingMetadata {
  /** Primary line — usually artist. */
  primary: string;
  /** Secondary line — usually title. */
  secondary: string;
  /** Muted metadata chips. */
  meta: string[];
  typeLabel: string;
}

export function useNowPlayingMetadata(item: PlaybackItem | null): NowPlayingMetadata | null {
  return useMemo(() => {
    if (!item) return null;

    if (item.type === "set") {
      const set = getSet(item.refId);
      if (!set) {
        return {
          primary: item.subtitle,
          secondary: item.title,
          meta: [],
          typeLabel: "Live set",
        };
      }
      const genre = set.genres[0] ? genreLabels[set.genres[0]] : null;
      return {
        primary: set.artistName,
        secondary: set.title,
        meta: [set.event, set.date?.slice(0, 4) ?? null, genre, set.duration].filter(
          (v): v is string => !!v,
        ),
        typeLabel: "Live set",
      };
    }

    if (item.type === "track") {
      const track = getTrack(item.refId);
      const artist = track ? getArtist(track.artistSlug) : null;
      const genre = artist?.genres[0] ? genreLabels[artist.genres[0]] : null;
      return {
        primary: track?.artist ?? item.subtitle,
        secondary: track?.title ?? item.title,
        meta: [track?.releaseYear, genre, track?.duration].filter((v): v is string => !!v),
        typeLabel: "Track",
      };
    }

    const release = getRelease(item.refId);
    return {
      primary: release?.artist ?? item.subtitle,
      secondary: release?.title ?? item.title,
      meta: [release?.year, release?.type, release?.label].filter((v): v is string => !!v),
      typeLabel: "Release",
    };
  }, [item]);
}
