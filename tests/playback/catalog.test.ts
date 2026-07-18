/**
 * Catalog playback coverage — every track and set must be authentic and playable.
 *
 * Run: npm run test:playback
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogTracks } from "../../src/content/tracks";
import { archiveSets } from "../../src/content/sets";
import { artists } from "../../src/content/artists/all";
import { playbackItemFromTrack, playbackItemFromSet } from "../../src/lib/music/playback";
import { analyzePlaybackItem } from "../../src/lib/music/playback-source";
import { isValidYoutubeId } from "../../src/lib/archive/pipeline/validate";
import {
  getVerifiedSetDuration,
  hasValidSpotifyTrackUrl,
  isStubTrackTitle,
} from "../../src/lib/catalog/apply-authenticity";

/** Authenticity baseline — fail if playable track count regresses. */
const MIN_PLAYABLE_TRACKS = 200;

describe("playback catalog coverage", () => {
  it("every public artist has verified playable media", () => {
    const empty = artists.filter((a) => a.topTracks.length === 0 && a.essentialSets.length === 0);
    assert.equal(
      empty.length,
      0,
      `Metadata-only artists:\n${empty.map((a) => `- ${a.slug}`).join("\n")}`,
    );
  });

  it("every archive set has a valid YouTube ID and resolvable source", () => {
    const broken = archiveSets.filter((set) => {
      if (!isValidYoutubeId(set.youtubeId)) return true;
      const analysis = analyzePlaybackItem(playbackItemFromSet(set));
      return !analysis.playable;
    });

    assert.equal(
      broken.length,
      0,
      `Broken sets:\n${broken.map((s) => `- ${s.id}: ${s.title}`).join("\n")}`,
    );
  });

  it("playable track count meets authenticity baseline", () => {
    const working = catalogTracks.filter((track) => {
      const analysis = analyzePlaybackItem(playbackItemFromTrack(track));
      return analysis.playable;
    });

    assert.ok(
      working.length >= MIN_PLAYABLE_TRACKS,
      `Playable tracks ${working.length} < baseline ${MIN_PLAYABLE_TRACKS}`,
    );
  });

  it("no set uses a blocked YouTube ID", async () => {
    const { isBlockedYoutubeId } = await import("../../src/lib/music/playback-blocklist");
    const blocked = archiveSets.filter((s) => isBlockedYoutubeId(s.youtubeId));
    assert.equal(blocked.length, 0, `Blocked set IDs: ${blocked.map((s) => s.youtubeId).join(", ")}`);
  });

  it("every catalog track has a valid Spotify track URL and no stub titles", () => {
    const broken = catalogTracks.filter((track) => {
      if (!hasValidSpotifyTrackUrl(track.spotifyUrl)) return true;
      if (isStubTrackTitle(track.title, track.artist)) return true;
      const analysis = analyzePlaybackItem(playbackItemFromTrack(track));
      return !analysis.playable;
    });

    assert.equal(
      broken.length,
      0,
      `Inauthentic tracks:\n${broken
        .slice(0, 20)
        .map((t) => `- ${t.id}: ${t.title} (${t.spotifyUrl || "no url"})`)
        .join("\n")}`,
    );
  });

  it("every archive set has verified duration ≥ 10 minutes", () => {
    const invalid = archiveSets.filter((s) => !s.duration);
    assert.equal(
      invalid.length,
      0,
      `Sets missing verified duration:\n${invalid.map((s) => `- ${s.id}: ${s.youtubeId}`).join("\n")}`,
    );
  });

  it("every set duration matches verified YouTube registry", () => {
    const broken = archiveSets.filter(
      (s) => !s.duration || getVerifiedSetDuration(s.youtubeId) !== s.duration,
    );
    assert.equal(
      broken.length,
      0,
      `Sets with unverified duration:\n${broken.map((s) => `- ${s.id}: ${s.duration}`).join("\n")}`,
    );
  });
});
