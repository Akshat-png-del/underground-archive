export const INGESTION_DIR = "data/ingestion";
export const ARTISTS_METADATA_DIR = `${INGESTION_DIR}/artists`;
export const MANIFEST_PATH = `${INGESTION_DIR}/manifest.json`;

export const MUSICBRAINZ_USER_AGENT =
  process.env.MUSICBRAINZ_USER_AGENT ?? "UndergroundArchive/1.0 (archive@localhost)";

export function getSpotifyCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getYoutubeApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() ?? null;
}

export function getDiscogsToken(): string | null {
  return process.env.DISCOGS_TOKEN?.trim() ?? null;
}

export function hasMusicBrainzConfig(): boolean {
  return !!MUSICBRAINZ_USER_AGENT;
}
