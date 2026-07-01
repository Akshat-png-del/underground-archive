/**
 * UI persistence tests — playback must survive UI/engine rebind cycles.
 *
 * Run: npm run test:playback
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { PlaybackItem } from "@/lib/music/playback";
import { globalPlayerEngine } from "@/lib/music/global-player-engine";
import {
  usePlaybackStore,
  initializePlaybackEngine,
  dockPlaybackEngine,
} from "@/stores/playback-store";
import { playItem, seekTo } from "@/lib/music/playback-actions";
import { resetPlaybackForTests } from "@/lib/music/playback-test-harness";
import { installPlaybackMockDom } from "./mock-dom";

function previewItem(): PlaybackItem {
  return {
    type: "track",
    refId: "ui-persist::preview",
    label: "UI Persist Preview",
    title: "Preview",
    subtitle: "Test",
    previewUrl: "https://example.com/preview.mp3",
  };
}

describe("playback UI persistence", () => {
  beforeEach(() => {
    installPlaybackMockDom();
    resetPlaybackForTests();
    initializePlaybackEngine();
  });

  it("engine rebind does not restart playback generation", async () => {
    playItem(previewItem());
    await new Promise((r) => setTimeout(r, 15));
    const genBefore = globalPlayerEngine.getGeneration();
    const playingBefore = usePlaybackStore.getState().isPlaying;

    initializePlaybackEngine();
    initializePlaybackEngine();

    assert.equal(globalPlayerEngine.getGeneration(), genBefore);
    assert.equal(usePlaybackStore.getState().isPlaying, playingBefore);
  });

  it("idempotent dock does not restart playback", async () => {
    globalPlayerEngine.mount();
    const host = document.createElement("div");
    host.setAttribute("data-player-embed-host", "true");
    document.body.appendChild(host);

    playItem(previewItem());
    await new Promise((r) => setTimeout(r, 15));
    const genBefore = globalPlayerEngine.getGeneration();

    dockPlaybackEngine(host);
    dockPlaybackEngine(host);

    assert.equal(globalPlayerEngine.getGeneration(), genBefore);
  });

  it("seek remains functional after engine rebind", async () => {
    playItem(previewItem());
    await new Promise((r) => setTimeout(r, 15));

    initializePlaybackEngine();
    seekTo(25);

    assert.equal(usePlaybackStore.getState().currentTime, 25);
    assert.equal(globalPlayerEngine.getSnapshot().currentTime, 25);
  });

  it("persistent embed mount marker exists after engine init", () => {
    globalPlayerEngine.mount();
    const root = document.getElementById("vitalforge-playback-root");
    assert.ok(root);
    assert.equal(document.querySelectorAll("#vitalforge-playback-root").length, 1);
  });
});
