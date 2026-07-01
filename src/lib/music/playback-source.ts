import type { LibraryItemType } from "@/types/library";
import { extractSpotifyEmbedUrl, extractYouTubeId } from "@/lib/music";
import type { PlaybackItem } from "@/lib/music/playback";
import {
  enrichTrackItemSources,
  logTrackSourceResolution,
  resolveTrackSpotifyUrl,
} from "@/lib/music/track-source";
import {
  blockedSourceIssue,
  isBlockedSpotifyTrackId,
  isBlockedYoutubeId,
} from "@/lib/music/playback-blocklist";

export type PlaybackSourceKind = "preview" | "spotify" | "youtube" | "none";

export interface ResolvedPlaybackSource {
  kind: PlaybackSourceKind;
  sourceUrl: string | null;
  embedUrl: string | null;
  issue: string | null;
}

export interface PlaybackSourceAnalysis extends ResolvedPlaybackSource {
  playable: boolean;
}

function youtubeEmbedUrl(ytId: string, autoplay = true): string {
  const params = new URLSearchParams({
    rel: "0",
    enablejsapi: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube.com/embed/${ytId}?${params.toString()}`;
}

function spotifyEmbedWithAutoplay(spotifyUrl: string, autoplay = true): string | null {
  const embed = extractSpotifyEmbedUrl(spotifyUrl);
  if (!embed) return null;
  const url = new URL(embed);
  if (autoplay) url.searchParams.set("autoplay", "1");
  return url.toString();
}

function spotifyEmbedKind(spotifyUrl: string): "track" | "album" | "artist" | "playlist" | "unknown" {
  const match = spotifyUrl.match(/spotify\.com\/(track|album|artist|playlist)\//);
  return (match?.[1] as "track" | "album" | "artist" | "playlist") ?? "unknown";
}

type PlaybackSourceInput = Pick<
  PlaybackItem,
  "type" | "refId" | "spotifyUrl" | "spotifyTrackId" | "youtubeUrl" | "youtubeId" | "previewUrl"
>;

function spotifyTrackIdFromUrl(spotifyUrl: string): string | null {
  const match = spotifyUrl.match(/spotify\.com\/track\/([a-zA-Z0-9]{22})/);
  return match?.[1] ?? null;
}

function prepareTrackSourceItem(item: PlaybackSourceInput): PlaybackSourceInput {
  const enriched = enrichTrackItemSources(item.refId, item);
  return {
    ...item,
    spotifyUrl: enriched.spotifyUrl ?? item.spotifyUrl,
    spotifyTrackId: enriched.spotifyTrackId ?? item.spotifyTrackId,
    youtubeUrl: enriched.youtubeUrl ?? item.youtubeUrl,
    youtubeId: enriched.youtubeId ?? item.youtubeId,
    previewUrl: enriched.previewUrl ?? item.previewUrl,
  };
}

function effectiveSpotifyUrl(item: PlaybackSourceInput): string | undefined {
  return resolveTrackSpotifyUrl(item);
}

export function resolvePlaybackSource(
  item: PlaybackSourceInput,
  autoplay = true,
): ResolvedPlaybackSource {
  if (item.type === "track") {
    item = prepareTrackSourceItem(item);
  }

  const spotifyUrl = effectiveSpotifyUrl(item);

  if (item.previewUrl) {
    return {
      kind: "preview",
      sourceUrl: item.previewUrl,
      embedUrl: null,
      issue: null,
    };
  }

  const ytId = item.youtubeId ?? extractYouTubeId(item.youtubeUrl ?? undefined);

  if (item.type === "set") {
    if (ytId) {
      if (isBlockedYoutubeId(ytId)) {
        return {
          kind: "none",
          sourceUrl: null,
          embedUrl: null,
          issue: blockedSourceIssue("youtube"),
        };
      }
      return {
        kind: "youtube",
        sourceUrl: item.youtubeUrl ?? `https://www.youtube.com/watch?v=${ytId}`,
        embedUrl: youtubeEmbedUrl(ytId, autoplay),
        issue: null,
      };
    }
    const spotifyEmbed = spotifyUrl ? spotifyEmbedWithAutoplay(spotifyUrl, autoplay) : null;
    if (spotifyEmbed) {
      return {
        kind: "spotify",
        sourceUrl: spotifyUrl!,
        embedUrl: spotifyEmbed,
        issue: null,
      };
    }
    return {
      kind: "none",
      sourceUrl: null,
      embedUrl: null,
      issue: "Set missing YouTube ID",
    };
  }

  if (item.type === "track") {
    if (spotifyUrl) {
      const kind = spotifyEmbedKind(spotifyUrl);
      if (kind === "track") {
        const trackId = spotifyTrackIdFromUrl(spotifyUrl);
        if (trackId && isBlockedSpotifyTrackId(trackId)) {
          // Fall through to YouTube or none.
        } else {
        const embed = spotifyEmbedWithAutoplay(spotifyUrl, autoplay);
        if (embed) {
          const resolved = {
            kind: "spotify" as const,
            sourceUrl: spotifyUrl,
            embedUrl: embed,
            issue: null,
          };
          logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
            url: embed,
            issue: null,
          });
          return resolved;
        }
        logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
          url: null,
          issue: "Spotify track embed URL could not be built",
          failureLine: "playback-source.ts:spotifyEmbedWithAutoplay(track)",
        });
        }
      }
    }

    if (ytId) {
      if (isBlockedYoutubeId(ytId)) {
        logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
          url: null,
          issue: blockedSourceIssue("youtube"),
        });
      } else {
      const embed = youtubeEmbedUrl(ytId, autoplay);
      logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
        url: embed,
        issue: null,
      });
      return {
        kind: "youtube",
        sourceUrl: item.youtubeUrl ?? `https://www.youtube.com/watch?v=${ytId}`,
        embedUrl: embed,
        issue: null,
      };
      }
    }

    if (spotifyUrl) {
      const embed = spotifyEmbedWithAutoplay(spotifyUrl, autoplay);
      if (embed) {
        const issue =
          spotifyEmbedKind(spotifyUrl) === "album" ? "Using album embed (no track URL)" : null;
        logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
          url: embed,
          issue,
        });
        return {
          kind: "spotify",
          sourceUrl: spotifyUrl,
          embedUrl: embed,
          issue,
        };
      }
      logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
        url: null,
        issue: "Unsupported Spotify URL format",
        failureLine: "playback-source.ts:track fallback spotifyEmbedWithAutoplay",
      });
      return {
        kind: "none",
        sourceUrl: spotifyUrl,
        embedUrl: null,
        issue: "Unsupported Spotify URL format",
      };
    }

    logTrackSourceResolution(item, enrichTrackItemSources(item.refId, item), {
      url: null,
      issue: "Track missing Spotify or YouTube URL",
      failureLine: "playback-source.ts:track missing spotifyUrl/spotifyTrackId/youtubeUrl/previewUrl",
    });
    return {
      kind: "none",
      sourceUrl: null,
      embedUrl: null,
      issue: "Track missing Spotify or YouTube URL",
    };
  }

  if (spotifyUrl) {
    const embed = spotifyEmbedWithAutoplay(spotifyUrl, autoplay);
    if (embed) {
      return {
        kind: "spotify",
        sourceUrl: spotifyUrl,
        embedUrl: embed,
        issue: null,
      };
    }
    return {
      kind: "none",
      sourceUrl: spotifyUrl,
      embedUrl: null,
      issue: "Unsupported Spotify URL format",
    };
  }

  if (ytId) {
    return {
      kind: "youtube",
      sourceUrl: item.youtubeUrl ?? `https://www.youtube.com/watch?v=${ytId}`,
      embedUrl: youtubeEmbedUrl(ytId, autoplay),
      issue: null,
    };
  }

  return {
    kind: "none",
    sourceUrl: null,
    embedUrl: null,
    issue: `Missing playback source for ${item.type}`,
  };
}

export function analyzePlaybackItem(item: PlaybackItem): PlaybackSourceAnalysis {
  const resolved = resolvePlaybackSource(item);
  const playable = resolved.kind === "preview" || !!resolved.embedUrl;
  return { ...resolved, playable };
}

export function canPlayItem(item: PlaybackItem): boolean {
  return analyzePlaybackItem(item).playable;
}

export function playbackSourceLabel(kind: PlaybackSourceKind): string {
  switch (kind) {
    case "preview":
      return "preview";
    case "spotify":
      return "spotify";
    case "youtube":
      return "youtube";
    default:
      return "none";
  }
}

export function entityTypeLabel(type: LibraryItemType): string {
  return type;
}
