import type { ArtistIngestedMetadata, ResolvedIngestedImage } from "./types";

/** Spotify → Discogs → MusicBrainz — manual research/registry overrides elsewhere. */
export function resolveIngestedImage(
  metadata: ArtistIngestedMetadata
): ResolvedIngestedImage | undefined {
  if (metadata.spotify?.imageUrl) {
    return {
      url: metadata.spotify.imageUrl,
      source: "spotify",
      sourceUrl: metadata.spotify.url,
    };
  }

  if (metadata.discogs?.imageUrl) {
    return {
      url: metadata.discogs.imageUrl,
      source: "discogs",
      sourceUrl: metadata.discogs.uri ?? `https://www.discogs.com/artist/${metadata.discogs.id}`,
    };
  }

  if (metadata.discogs?.thumbUrl) {
    return {
      url: metadata.discogs.thumbUrl,
      source: "discogs",
      sourceUrl: metadata.discogs.uri ?? `https://www.discogs.com/artist/${metadata.discogs.id}`,
    };
  }

  if (metadata.resolvedImage?.url) {
    return metadata.resolvedImage;
  }

  if (metadata.musicbrainz?.imageUrl) {
    return {
      url: metadata.musicbrainz.imageUrl,
      source: "musicbrainz",
      sourceUrl: `https://musicbrainz.org/artist/${metadata.musicbrainz.mbid}`,
    };
  }

  if (metadata.youtube?.thumbnailUrl) {
    return {
      url: metadata.youtube.thumbnailUrl,
      source: "youtube",
      sourceUrl: metadata.youtube.channelUrl ?? "",
    };
  }

  return undefined;
}
