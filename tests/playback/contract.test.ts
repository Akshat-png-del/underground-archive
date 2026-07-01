/**
 * Playback architecture contract tests.
 *
 * Run: npm run test:playback
 *
 * These tests fail immediately when UI refactors break playback invariants.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { catalogTracks } from "../../src/content/tracks";
import { archiveSets } from "../../src/content/sets";
import type { PlaybackItem } from "../../src/lib/music/playback";
import { playbackItemFromTrack, playbackItemFromSet } from "../../src/lib/music/playback";
import {
  globalPlayerEngine,
  __resetGlobalPlayerEngineForTests,
} from "../../src/lib/music/global-player-engine";
import { usePlaybackStore } from "../../src/stores/playback-store";
import { initializePlaybackEngine } from "../../src/stores/playback-store";
import {
  handlePlaybackSurfaceClick,
  expandPlaybackSurface,
  closePlayerSurface,
} from "../../src/lib/music/playback-actions";
import { resetPlaybackForTests } from "../../src/lib/music/playback-test-harness";
import { installPlaybackMockDom } from "./mock-dom";

function previewItem(): PlaybackItem {
  return {
    type: "track",
    refId: "contract::preview",
    label: "Contract — Preview",
    title: "Contract Preview",
    subtitle: "Test",
    previewUrl: "https://example.com/preview.mp3",
  };
}

function playableTrack() {
  const track = catalogTracks.find((t) => t.spotifyUrl || t.previewUrl);
  assert.ok(track, "catalog needs at least one playable track");
  return playbackItemFromTrack(track);
}

function playableSet() {
  const set = archiveSets.find((s) => s.youtubeId);
  assert.ok(set, "catalog needs at least one set with youtubeId");
  return playbackItemFromSet(set);
}

function secondPlayableTrack(first: ReturnType<typeof playableTrack>) {
  const track = catalogTracks.find(
    (t) => (t.spotifyUrl || t.previewUrl) && t.id !== first.refId,
  );
  assert.ok(track, "catalog needs a second playable track");
  return playbackItemFromTrack(track);
}

describe("playback architecture contracts", () => {
  beforeEach(() => {
    installPlaybackMockDom();
    resetPlaybackForTests();
    initializePlaybackEngine();
  });

  describe("engine singleton", () => {
    it("mounts once and survives remount calls", () => {
      globalPlayerEngine.mount();
      const root1 = document.getElementById("vitalforge-playback-root");
      globalPlayerEngine.mount();
      const root2 = document.getElementById("vitalforge-playback-root");
      assert.equal(root1, root2);
      assert.ok(globalPlayerEngine.isEngineMounted());
    });

    it("does not create duplicate roots", () => {
      globalPlayerEngine.mount();
      globalPlayerEngine.mount();
      const roots = document.querySelectorAll("#vitalforge-playback-root");
      assert.equal(roots.length, 1);
      assert.ok(document.getElementById("vitalforge-playback-root"));
    });
  });

  describe("store session state", () => {
    it("play sets single active track and opens player surface", () => {
      const item = playableTrack();
      usePlaybackStore.getState().play(item);
      const state = usePlaybackStore.getState();
      assert.equal(state.currentTrack?.refId, item.refId);
      assert.equal(state.detailsOpen, true);
      assert.ok(state.queue.length >= 1);
    });

    it("isActive identifies current item only", () => {
      const item = playableTrack();
      usePlaybackStore.getState().play(item);
      const { isActive } = usePlaybackStore.getState();
      assert.equal(isActive(item.type, item.refId), true);
      assert.equal(isActive("set", "nonexistent"), false);
    });

    it("closePlayerSurface collapses video stage without stopping session track", () => {
      const item = playableTrack();
      usePlaybackStore.getState().play(item);
      closePlayerSurface();
      const state = usePlaybackStore.getState();
      assert.equal(state.detailsOpen, false);
      assert.equal(state.currentTrack?.refId, item.refId);
    });
  });

  describe("transport state (engine-owned)", () => {
    it("track play → pause → resume", () => {
      const item = previewItem();
      usePlaybackStore.getState().play(item);
      usePlaybackStore.getState().pause();
      assert.equal(usePlaybackStore.getState().isPlaying, false);
      usePlaybackStore.getState().resume();
      const snap = globalPlayerEngine.getSnapshot();
      assert.equal(snap.currentTrack?.refId, item.refId);
    });

    it("track A → track B switches active item", () => {
      const a = playableTrack();
      const b = secondPlayableTrack(a);
      usePlaybackStore.getState().play(a);
      usePlaybackStore.getState().play(b);
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, b.refId);
      assert.equal(globalPlayerEngine.getSnapshot().currentTrack?.refId, b.refId);
    });

    it("track → set switches provider mode", async () => {
      const track = playableTrack();
      const set = playableSet();
      usePlaybackStore.getState().play(track);
      await new Promise((r) => setTimeout(r, 20));
      usePlaybackStore.getState().play(set);
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(usePlaybackStore.getState().currentTrack?.type, "set");
      assert.equal(globalPlayerEngine.getSnapshot().mode, "embed");
    });

    it("set → track switches provider mode", () => {
      const set = playableSet();
      const track = playableTrack();
      usePlaybackStore.getState().play(set);
      usePlaybackStore.getState().play(track);
      assert.equal(usePlaybackStore.getState().currentTrack?.type, "track");
    });

    it("rapid switching ends on last item", () => {
      const items = [
        playableTrack(),
        playableSet(),
        secondPlayableTrack(playableTrack()),
      ];
      for (const item of items) {
        usePlaybackStore.getState().play(item);
      }
      const last = items[items.length - 1];
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, last.refId);
      assert.ok(globalPlayerEngine.getGeneration() >= items.length);
    });

    it("engine seek updates audio currentTime", async () => {
      const item = previewItem();
      globalPlayerEngine.play(item);
      await new Promise((r) => setTimeout(r, 15));
      globalPlayerEngine.seek(42);
      assert.equal(globalPlayerEngine.getSnapshot().currentTime, 42);
    });

    it("seek updates currentTime in store", async () => {
      const item = previewItem();
      usePlaybackStore.getState().play(item);
      await new Promise((r) => setTimeout(r, 20));
      usePlaybackStore.getState().seek(42);
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(usePlaybackStore.getState().currentTime, 42);
    });

    it("previous restarts when playback past 3 seconds", () => {
      const item = previewItem();
      usePlaybackStore.getState().play(item);
      usePlaybackStore.getState().seek(5);
      usePlaybackStore.getState().previous();
      assert.equal(usePlaybackStore.getState().currentTime, 0);
    });

    it("queue index tracks browse context when switching tracks", () => {
      const a = previewItem();
      const b = { ...previewItem(), refId: "contract::preview-2", title: "Contract Preview 2" };
      const queue = [a, b];
      usePlaybackStore.getState().play(a, { browse: { queue, queueIndex: 0 } });
      usePlaybackStore.getState().play(b, { browse: { queue, queueIndex: 1 } });
      const { queue: storedQueue, queueIndex, currentTrack } = usePlaybackStore.getState();
      assert.equal(currentTrack?.refId, b.refId);
      assert.equal(queueIndex, 1);
      assert.equal(storedQueue.length, 2);
    });

    it("previous advances to prior browse item when near start", async () => {
      const a = previewItem();
      const b = { ...previewItem(), refId: "contract::preview-2", title: "Contract Preview 2" };
      const queue = [a, b];
      usePlaybackStore.getState().play(a, { browse: { queue, queueIndex: 0 } });
      await new Promise((r) => setTimeout(r, 25));
      usePlaybackStore.getState().play(b, { browse: { queue, queueIndex: 1 } });
      await new Promise((r) => setTimeout(r, 25));
      usePlaybackStore.getState().previous();
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, a.refId);
    });

    it("isolated play resets browse queue to single item", () => {
      const a = previewItem();
      const b = { ...previewItem(), refId: "contract::preview-2", title: "Contract Preview 2" };
      usePlaybackStore.getState().play(a);
      usePlaybackStore.getState().play(b);
      const { queue, currentTrack } = usePlaybackStore.getState();
      assert.equal(currentTrack?.refId, b.refId);
      assert.equal(queue.length, 1);
      assert.equal(queue[0]?.refId, b.refId);
    });

    it("next and previous traverse browse queue in order", async () => {
      const a = previewItem();
      const b = { ...previewItem(), refId: "contract::preview-2", title: "Contract Preview 2" };
      const c = { ...previewItem(), refId: "contract::preview-3", title: "Contract Preview 3" };
      const queue = [a, b, c];
      usePlaybackStore.getState().play(a, { browse: { queue, queueIndex: 0 } });
      await new Promise((r) => setTimeout(r, 20));
      usePlaybackStore.getState().play(b, { browse: { queue, queueIndex: 1 } });
      await new Promise((r) => setTimeout(r, 20));
      usePlaybackStore.getState().play(c, { browse: { queue, queueIndex: 2 } });
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(usePlaybackStore.getState().queueIndex, 2);
      usePlaybackStore.getState().previous();
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, b.refId);
      usePlaybackStore.getState().next();
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, c.refId);
    });

    it("stop clears session", () => {
      const item = playableTrack();
      usePlaybackStore.getState().play(item);
      usePlaybackStore.getState().stop();
      assert.equal(usePlaybackStore.getState().currentTrack, null);
      assert.equal(globalPlayerEngine.getSnapshot().currentTrack, null);
    });
  });

  describe("actions layer click policy", () => {
    it("inactive surface click starts playback", () => {
      const item = playableTrack();
      handlePlaybackSurfaceClick(item, item.type, item.refId);
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, item.refId);
      assert.equal(usePlaybackStore.getState().detailsOpen, true);
    });

    it("active audio surface click toggles transport without details gate", async () => {
      const item = previewItem();
      usePlaybackStore.getState().play(item);
      await new Promise((r) => setTimeout(r, 20));
      closePlayerSurface();
      usePlaybackStore.getState().pause();
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(usePlaybackStore.getState().isPlaying, false);
      assert.equal(usePlaybackStore.getState().detailsOpen, false);
      handlePlaybackSurfaceClick(item, item.type, item.refId);
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(usePlaybackStore.getState().isPlaying, true);
    });

    it("expandPlaybackSurface redirects sets to watch page without starting playback", () => {
      const set = playableSet();
      expandPlaybackSurface(set, "set", set.refId);
      assert.equal(usePlaybackStore.getState().currentTrack, null);
    });
  });
});
