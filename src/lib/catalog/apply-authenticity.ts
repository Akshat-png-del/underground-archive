/**
 * Catalog authenticity cleanup — content-layer only.
 *
 * Media-first gate: removes placeholder media, invalid URLs, short/unverified sets,
 * and metadata-only artists. Does not touch playback systems.
 */
import type { Artist, Release, Track } from "@/types";
import {
  MIN_VERIFIED_SET_SECONDS,
  YOUTUBE_TOO_SHORT_IDS,
  YOUTUBE_UNPLAYABLE_IDS,
  YOUTUBE_VERIFIED_DURATIONS,
} from "@/lib/catalog/youtube-verified-durations";
import { SPOTIFY_VERIFIED_DURATIONS } from "@/lib/catalog/spotify-verified-durations";

const STUB_TITLES = new Set([
  "Warehouse Pressure",
  "Peak Hour",
  "Distorted Dreams",
  "Night Shift",
  "Raw Energy",
  "Factory Floor",
  "Steel Rhythm",
  "Dark Matter",
  "Machine Soul",
  "Void",
  "Cold Pulse",
  "Body Control",
  "Neon Decay",
  "Ashes",
  "Midnight Drive",
  "Live Session",
  "Essential Mix",
  "Warehouse",
]);

/** Fake / placeholder durations that must never display. */
const PLACEHOLDER_DURATIONS = new Set(["5:00", "0:00", "00:00", "--:--", "—", "-", "Unknown"]);

const SPOTIFY_TRACK_RE = /open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/;
const SPOTIFY_ALBUM_RE = /open\.spotify\.com\/album\/([a-zA-Z0-9]{22})/;
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function isStubTrackTitle(title: string, artistName?: string): boolean {
  if (STUB_TITLES.has(title)) return true;
  if (artistName && title === artistName) return true;
  return false;
}

export function hasValidSpotifyTrackUrl(url?: string): boolean {
  return !!url && SPOTIFY_TRACK_RE.test(url);
}

export function hasValidSpotifyAlbumUrl(url?: string): boolean {
  return !!url && SPOTIFY_ALBUM_RE.test(url);
}

export function hasValidYoutubeId(id?: string): boolean {
  return !!id && YOUTUBE_ID_RE.test(id.trim());
}

export function getVerifiedSetDuration(youtubeId: string): string | undefined {
  return YOUTUBE_VERIFIED_DURATIONS[youtubeId]?.display;
}

export function getVerifiedSetDurationSeconds(youtubeId: string): number | undefined {
  return YOUTUBE_VERIFIED_DURATIONS[youtubeId]?.seconds;
}

/** Set passes media-first gate: valid ID, API-verified, playable, duration ≥ 10 min. */
export function isVerifiedLongSet(youtubeId?: string): boolean {
  if (!hasValidYoutubeId(youtubeId)) return false;
  const id = youtubeId!.trim();
  if (YOUTUBE_UNPLAYABLE_IDS.has(id) || YOUTUBE_TOO_SHORT_IDS.has(id)) return false;
  const verified = YOUTUBE_VERIFIED_DURATIONS[id];
  return !!verified && verified.seconds >= MIN_VERIFIED_SET_SECONDS;
}

export function extractSpotifyTrackId(url?: string): string | undefined {
  const m = url?.match(SPOTIFY_TRACK_RE);
  return m?.[1];
}

export function isPlaceholderTrackDuration(duration?: string | null): boolean {
  if (!duration?.trim()) return true;
  return PLACEHOLDER_DURATIONS.has(duration.trim());
}

/**
 * Spotify API duration is the only source of truth.
 * Verified registry wins; placeholders and unverified values become empty.
 */
export function applyVerifiedTrackDuration(track: Track): Track {
  const id = extractSpotifyTrackId(track.spotifyUrl);
  if (id) {
    const verified = SPOTIFY_VERIFIED_DURATIONS[id];
    if (verified?.display) {
      return { ...track, duration: verified.display };
    }
  }
  return { ...track, duration: "" };
}

export function isAuthenticTrack(track: Track, artistName?: string): boolean {
  if (!hasValidSpotifyTrackUrl(track.spotifyUrl)) return false;
  if (isStubTrackTitle(track.title, artistName)) return false;
  return true;
}

function isAuthenticRelease(release: Release): boolean {
  return hasValidSpotifyAlbumUrl(release.spotifyUrl) || hasValidSpotifyTrackUrl(release.spotifyUrl);
}

function cleanListeningPath(artist: Artist): Artist["listeningPath"] {
  const trackTitles = new Set(artist.topTracks.map((t) => t.title));
  const setTitles = new Set(artist.essentialSets.map((s) => s.title));
  return artist.listeningPath.filter((step) => {
    if (step.type === "track") return trackTitles.has(step.title);
    if (step.type === "set") return setTitles.has(step.title);
    if (step.type === "ep" || step.type === "album") {
      return [...artist.eps, ...artist.albums, ...artist.singles].some((r) => r.title === step.title);
    }
    return false;
  });
}

/** Strip inauthentic media from a single artist. */
export function sanitizeArtistMedia(artist: Artist): Artist {
  const topTracks = artist.topTracks
    .filter((t) => isAuthenticTrack(t, artist.name))
    .map(applyVerifiedTrackDuration);
  const essentialSets = artist.essentialSets.filter((s) => isVerifiedLongSet(s.youtubeId));
  const albums = artist.albums.filter(isAuthenticRelease);
  const eps = artist.eps.filter(isAuthenticRelease);
  const singles = artist.singles.filter(isAuthenticRelease);

  const next: Artist = {
    ...artist,
    topTracks,
    essentialSets,
    albums,
    eps,
    singles,
  };
  return {
    ...next,
    listeningPath: cleanListeningPath(next),
  };
}

/** Media-first: artist must have playable Spotify track(s) or verified long set(s). */
export function artistHasAuthenticMedia(artist: Artist): boolean {
  return artist.topTracks.length > 0 || artist.essentialSets.length > 0;
}

/**
 * Final catalog gate: sanitize inauthentic media, drop metadata-only artists,
 * repair similarArtists.
 */
export function applyAuthenticityCleanup(artists: Artist[]): Artist[] {
  const sanitized = artists.map(sanitizeArtistMedia).filter(artistHasAuthenticMedia);
  const validSlugs = new Set(sanitized.map((a) => a.slug));

  return sanitized.map((artist) => ({
    ...artist,
    similarArtists: [...new Set(
      artist.similarArtists.filter((slug) => validSlugs.has(slug) && slug !== artist.slug),
    )],
  }));
}

export const PLACEHOLDER_TRACK_TITLES = [...STUB_TITLES];
