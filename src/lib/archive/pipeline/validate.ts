import type { ArtistResearchRecord } from "@/content/artists/research/types";
import { fieldVerified } from "@/content/artists/research/types";
import {
  ALLOWED_SET_VENUE_PATTERNS,
  CONFIDENCE_THRESHOLD,
  SPOTIFY_ARTIST_ID_PATTERN,
  SPOTIFY_TRACK_ID_PATTERN,
  YOUTUBE_ID_PATTERN,
} from "./constants";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Exact name match — no fuzzy matching. */
export function namesMatch(expected: string, actual: string): boolean {
  return normalizeName(expected) === normalizeName(actual);
}

export function isAllowedSetVenue(venue: string): boolean {
  const v = venue.toLowerCase();
  return ALLOWED_SET_VENUE_PATTERNS.some((pattern) => v.includes(pattern));
}

export function isValidSpotifyArtistId(id: string): boolean {
  return SPOTIFY_ARTIST_ID_PATTERN.test(id);
}

export function isValidSpotifyTrackId(id: string): boolean {
  return SPOTIFY_TRACK_ID_PATTERN.test(id);
}

export function isValidYoutubeId(id: string): boolean {
  return YOUTUBE_ID_PATTERN.test(id);
}

export function spotifyArtistUrl(artistId: string): string {
  return `https://open.spotify.com/artist/${artistId}`;
}

export function spotifyTrackUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export function validateResearchRecord(record: ArtistResearchRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!record.slug?.trim()) {
    issues.push({ code: "MISSING_SLUG", message: "Research record missing slug" });
  }
  if (!record.name?.trim()) {
    issues.push({ code: "MISSING_NAME", message: "Research record missing name" });
  }

  if (record.spotify) {
    if (!fieldVerified(record.spotify.confidence)) {
      issues.push({ code: "SPOTIFY_LOW_CONFIDENCE", message: `${record.slug}: Spotify below threshold` });
    }
    if (!isValidSpotifyArtistId(record.spotify.artistId)) {
      issues.push({ code: "SPOTIFY_INVALID_ID", message: `${record.slug}: Invalid Spotify artist ID` });
    }
    if (record.spotify.url !== spotifyArtistUrl(record.spotify.artistId)) {
      issues.push({ code: "SPOTIFY_URL_MISMATCH", message: `${record.slug}: Spotify URL does not match artist ID` });
    }
  }

  for (const [field, url] of [
    ["instagram", record.instagram],
    ["soundcloud", record.soundcloud],
    ["youtube", record.youtube],
    ["residentAdvisor", record.residentAdvisor],
    ["website", record.website],
  ] as const) {
    if (!url) continue;
    if (!fieldVerified(url.confidence)) {
      issues.push({ code: `${field.toUpperCase()}_LOW_CONFIDENCE`, message: `${record.slug}: ${field} below threshold` });
    }
    if (!url.url.startsWith("http")) {
      issues.push({ code: `${field.toUpperCase()}_INVALID_URL`, message: `${record.slug}: ${field} URL invalid` });
    }
  }

  if (record.image && !fieldVerified(record.image.confidence)) {
    issues.push({ code: "IMAGE_LOW_CONFIDENCE", message: `${record.slug}: Image below threshold` });
  }

  for (const track of record.tracks ?? []) {
    if (!fieldVerified(track.confidence)) {
      issues.push({ code: "TRACK_LOW_CONFIDENCE", message: `${record.slug}: Track "${track.title}" below threshold` });
    }
    if (!isValidSpotifyTrackId(track.spotifyTrackId)) {
      issues.push({ code: "TRACK_INVALID_ID", message: `${record.slug}: Invalid track ID for "${track.title}"` });
    }
  }

  for (const set of record.sets ?? []) {
    if (!fieldVerified(set.confidence)) {
      issues.push({ code: "SET_LOW_CONFIDENCE", message: `${record.slug}: Set "${set.title}" below threshold` });
    }
    if (!isValidYoutubeId(set.youtubeId)) {
      issues.push({ code: "SET_INVALID_YOUTUBE", message: `${record.slug}: Invalid YouTube ID` });
    }
    if (!isAllowedSetVenue(set.venue)) {
      issues.push({ code: "SET_VENUE_UNRECOGNIZED", message: `${record.slug}: Venue "${set.venue}" not in allowlist` });
    }
  }

  if (record.verificationStatus === "verified") {
    if (!record.spotify || !fieldVerified(record.spotify.confidence)) {
      issues.push({ code: "VERIFIED_NO_SPOTIFY", message: `${record.slug}: Verified without Spotify profile` });
    }
  }

  return issues;
}

export function passesConfidence(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}
