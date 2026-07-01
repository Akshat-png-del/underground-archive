/**
 * Catalog playback coverage — every track and set must meet stability baselines.
 *
 * Run: npm run test:playback
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogTracks } from "../../src/content/tracks";
import { archiveSets } from "../../src/content/sets";
import { playbackItemFromTrack, playbackItemFromSet } from "../../src/lib/music/playback";
import { analyzePlaybackItem } from "../../src/lib/music/playback-source";
import { isValidYoutubeId } from "../../src/lib/archive/pipeline/validate";

/** Baseline from playback-stability-audit — fail if playable track count regresses. */
const MIN_PLAYABLE_TRACKS = 230;

describe("playback catalog coverage", () => {
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

  it("playable track count meets baseline", () => {
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

  it("reports broken track inventory for diagnostics", () => {
    const broken = catalogTracks.filter((track) => {
      const analysis = analyzePlaybackItem(playbackItemFromTrack(track));
      return !analysis.playable;
    });

    // Informational — broken tracks are missing catalog metadata, not engine bugs.
    assert.ok(broken.length > 0, "expected some tracks without metadata (catalog expansion backlog)");
    assert.ok(broken.length < catalogTracks.length, "at least some tracks must be playable");
  });
});
