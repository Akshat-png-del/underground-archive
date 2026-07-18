/**
 * Verified Spotify track durations — fetched via Spotify Web API (duration_ms).
 * Do not edit manually. Regenerate: npx tsx scripts/verify-spotify-track-durations.ts
 * Generated: 2026-07-17T07:18:03.463Z
 */

export type SpotifyVerifiedDuration = { ms: number; display: string };

export const SPOTIFY_VERIFIED_DURATIONS: Readonly<Record<string, SpotifyVerifiedDuration>> = {
};

export function getSpotifyVerifiedDurationDisplay(trackId: string): string | undefined {
  return SPOTIFY_VERIFIED_DURATIONS[trackId]?.display;
}
