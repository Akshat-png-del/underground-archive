import blocklist from "../../../data/playback-blocklist.json";

const youtubeBlocked = new Set<string>(blocklist.youtubeIds ?? []);
const spotifyBlocked = new Set<string>(blocklist.spotifyTrackIds ?? []);

export function isBlockedYoutubeId(id: string | null | undefined): boolean {
  if (!id) return false;
  return youtubeBlocked.has(id);
}

export function isBlockedSpotifyTrackId(id: string | null | undefined): boolean {
  if (!id) return false;
  return spotifyBlocked.has(id);
}

export function blockedSourceIssue(kind: "youtube" | "spotify"): string {
  return kind === "youtube"
    ? "YouTube video blocked (unavailable or removed)"
    : "Spotify track blocked (unavailable or removed)";
}
