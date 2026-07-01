/**
 * MediaEngine immutability + event bus contract tests.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { PlaybackItem } from "@/lib/music/playback";
import { mediaEngine } from "@/lib/music/global-player-engine";
import { mediaEngineEvents, type MediaEngineEvent } from "@/lib/music/media-engine-events";
import { bootstrapMediaEngine } from "@/lib/music/media-engine-bootstrap";
import { initializePlaybackEngine } from "@/stores/playback-store";
import { playItem, seekTo } from "@/lib/music/playback-actions";
import { resetPlaybackForTests } from "@/lib/music/playback-test-harness";
import { installPlaybackMockDom } from "./mock-dom";

function previewItem(): PlaybackItem {
  return {
    type: "track",
    refId: "events::preview",
    label: "Events Preview",
    title: "Preview",
    subtitle: "Test",
    previewUrl: "https://example.com/preview.mp3",
  };
}

describe("MediaEngine immutability", () => {
  beforeEach(() => {
    installPlaybackMockDom();
    resetPlaybackForTests();
    initializePlaybackEngine();
  });

  it("bootstrap is idempotent and does not recreate router generation", async () => {
    playItem(previewItem());
    await new Promise((r) => setTimeout(r, 15));
    const genBefore = mediaEngine.getGeneration();

    bootstrapMediaEngine();
    bootstrapMediaEngine();
    initializePlaybackEngine();
    initializePlaybackEngine();

    assert.equal(mediaEngine.getGeneration(), genBefore);
  });

  it("emits onInit once per engine lifetime", () => {
    const events: MediaEngineEvent[] = [];
    const unsub = mediaEngineEvents.subscribe((e) => events.push(e));
    bootstrapMediaEngine();
    unsub();
    const inits = events.filter((e) => e.type === "onInit");
    assert.equal(inits.length, 0, "onInit fires on first router create during reset, not re-bootstrap");
  });

  it("emits onTrackChange and onTimeUpdate during playback", async () => {
    const types: MediaEngineEvent["type"][] = [];
    const unsub = mediaEngineEvents.subscribe((e) => types.push(e.type));

    playItem(previewItem());
    await new Promise((r) => setTimeout(r, 20));
    seekTo(12);
    await new Promise((r) => setTimeout(r, 5));

    unsub();
    assert.ok(types.includes("onTrackChange"));
    assert.ok(types.includes("onSeek"));
    assert.ok(types.includes("onTimeUpdate") || types.includes("onPlay"));
  });
});
