import type { CatalogTrack } from "@/types/library";
import { isValidSpotifyTrackId, spotifyTrackUrl } from "@/lib/archive/pipeline/validate";
import { extractYouTubeId } from "@/lib/music";
import { getTrack } from "@/content/tracks";

/** Raw track-like objects from catalog, UI props, or persisted playback state. */
export type TrackSourceInput = {
  id?: string;
  refId?: string;
  spotifyUrl?: string | null;
  spotifyTrackId?: string | null;
  trackId?: string | null;
  youtubeUrl?: string | null;
  youtubeId?: string | null;
  previewUrl?: string | null;
  external?: { spotify?: string | null };
  spotify?: { id?: string | null; url?: string | null };
};

export interface NormalizedTrackSources {
  spotifyUrl?: string;
  spotifyTrackId?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  previewUrl?: string;
}

function nonEmpty(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function extractSpotifyTrackId(input: TrackSourceInput): string | undefined {
  const candidates = [
    input.spotifyTrackId,
    input.trackId,
    input.spotify?.id,
  ];

  for (const candidate of candidates) {
    const value = nonEmpty(candidate);
    if (value && isValidSpotifyTrackId(value)) return value;
  }

  const urlCandidates = [
    input.spotifyUrl,
    input.external?.spotify,
    input.spotify?.url,
  ];

  for (const candidate of urlCandidates) {
    const url = nonEmpty(candidate);
    if (!url) continue;
    const match = url.match(/\/track\/([a-zA-Z0-9]{22})/);
    if (match?.[1] && isValidSpotifyTrackId(match[1])) return match[1];
  }

  return undefined;
}

export function resolveTrackSpotifyUrl(input: TrackSourceInput): string | undefined {
  const directUrl = nonEmpty(input.spotifyUrl) ?? nonEmpty(input.external?.spotify) ?? nonEmpty(input.spotify?.url);
  if (directUrl?.includes("/track/")) return directUrl;

  const trackId = extractSpotifyTrackId(input);
  if (trackId) return spotifyTrackUrl(trackId);

  return directUrl;
}

export function normalizeTrackSourceFields(input: TrackSourceInput): NormalizedTrackSources {
  const spotifyUrl = resolveTrackSpotifyUrl(input);
  const spotifyTrackId =
    extractSpotifyTrackId(input) ?? spotifyUrl?.match(/\/track\/([a-zA-Z0-9]{22})/)?.[1];
  const youtubeUrl = nonEmpty(input.youtubeUrl);
  const youtubeId = nonEmpty(input.youtubeId) ?? extractYouTubeId(youtubeUrl) ?? undefined;
  const previewUrl = nonEmpty(input.previewUrl);

  return {
    spotifyUrl,
    spotifyTrackId,
    youtubeUrl,
    youtubeId,
    previewUrl,
  };
}

export function normalizeCatalogTrackSources(track: CatalogTrack): NormalizedTrackSources {
  return normalizeTrackSourceFields({
    id: track.id,
    refId: track.id,
    spotifyUrl: track.spotifyUrl,
    youtubeUrl: track.youtubeUrl,
    previewUrl: track.previewUrl,
  });
}

/** Merge partial playback fields with canonical catalog data for a track refId. */
export function enrichTrackItemSources(
  refId: string,
  partial: TrackSourceInput,
): NormalizedTrackSources {
  const catalog = getTrack(refId);
  const catalogSources = catalog ? normalizeCatalogTrackSources(catalog) : {};

  return normalizeTrackSourceFields({
    refId,
    spotifyUrl: partial.spotifyUrl ?? catalogSources.spotifyUrl,
    spotifyTrackId: partial.spotifyTrackId ?? catalogSources.spotifyTrackId,
    youtubeUrl: partial.youtubeUrl ?? catalogSources.youtubeUrl,
    youtubeId: partial.youtubeId ?? catalogSources.youtubeId,
    previewUrl: partial.previewUrl ?? catalogSources.previewUrl,
    trackId: partial.trackId,
    external: partial.external,
    spotify: partial.spotify,
  });
}

export function logTrackSourceResolution(
  track: TrackSourceInput,
  sources: NormalizedTrackSources,
  final: { url: string | null; issue: string | null; failureLine?: string },
): void {
  console.log("[TRACK CLICK] track object", track);
  console.log("[SOURCE RESOLUTION]", {
    "track.id": track.id ?? track.refId,
    spotifyTrackId: sources.spotifyTrackId,
    spotifyUrl: sources.spotifyUrl,
    youtubeUrl: sources.youtubeUrl,
    previewUrl: sources.previewUrl,
  });
  console.log("[FINAL SOURCE]", final.url, final.issue ? `(issue: ${final.issue})` : "");
  if (final.failureLine) {
    console.log("[SOURCE RESOLUTION] failure at", final.failureLine);
  }
}
