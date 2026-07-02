/**
 * Playback regression tests — transport, navigation survival, Fast Refresh, dedupe.
 *
 * Run: npm run test:playback
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { PlaybackItem } from "../../src/lib/music/playback";
import { playbackItemFromTrack, playbackItemFromSet } from "../../src/lib/music/playback";
import { catalogTracks } from "../../src/content/tracks";
import { archiveSets } from "../../src/content/sets";
import { mediaSessionController } from "../../src/lib/music/media-session-controller";
import {
  globalPlayerEngine,
} from "../../src/lib/music/global-player-engine";
import {
  usePlaybackStore,
  initializePlaybackEngine,
  __resetPlaybackModuleForTests,
} from "../../src/stores/playback-store";
import {
  playItem,
  pause,
  resume,
  seekTo,
  retryPlayback,
  __allowSetPlayOutsideWatchPageForTests,
} from "../../src/lib/music/playback-actions";
import { resetPlaybackForTests } from "../../src/lib/music/playback-test-harness";
import { installPlaybackMockDom } from "./mock-dom";

function previewItem(suffix = ""): PlaybackItem {
  return {
    type: "track",
    refId: `regression::preview${suffix}`,
    label: "Regression Preview",
    title: `Preview ${suffix}`,
    subtitle: "Test",
    previewUrl: "https://example.com/preview.mp3",
  };
}

function playableTrack() {
  const track = catalogTracks.find((t) => t.spotifyUrl || t.previewUrl);
  assert.ok(track);
  return playbackItemFromTrack(track);
}

function playableSet() {
  const set = archiveSets.find((s) => s.youtubeId);
  assert.ok(set);
  return playbackItemFromSet(set);
}

describe("playback regression", () => {
  beforeEach(() => {
    installPlaybackMockDom();
    resetPlaybackForTests();
    __allowSetPlayOutsideWatchPageForTests(true);
    initializePlaybackEngine();
  });

  describe("transport lifecycle", () => {
    it("play → pause → resume", () => {
      const item = previewItem();
      playItem(item);
      pause();
      assert.equal(usePlaybackStore.getState().isPlaying, false);
      resume();
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, item.refId);
    });

    it("seek updates store and engine", async () => {
      playItem(previewItem());
      await new Promise((r) => setTimeout(r, 20));
      seekTo(30);
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(usePlaybackStore.getState().currentTime, 30);
      assert.equal(globalPlayerEngine.getSnapshot().currentTime, 30);
    });
  });

  describe("switching", () => {
    it("track switching updates active item", () => {
      const a = playableTrack();
      const b = catalogTracks.find(
        (t) => (t.spotifyUrl || t.previewUrl) && t.id !== a.refId,
      );
      assert.ok(b);
      const bItem = playbackItemFromTrack(b);
      playItem(a);
      playItem(bItem);
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, bItem.refId);
    });

    it("set switching uses embed mode", async () => {
      const setA = playableSet();
      const setB = archiveSets.find((s) => s.youtubeId && s.id !== setA.refId);
      assert.ok(setB);
      playItem(setA);
      await new Promise((r) => setTimeout(r, 25));
      playItem(playbackItemFromSet(setB));
      await new Promise((r) => setTimeout(r, 25));
      assert.equal(globalPlayerEngine.getSnapshot().mode, "embed");
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, setB.id);
    });

    it("track → set → track switches providers", () => {
      playItem(playableTrack());
      playItem(playableSet());
      assert.equal(globalPlayerEngine.getSnapshot().mode, "embed");
      playItem(playableTrack());
      assert.notEqual(globalPlayerEngine.getSnapshot().mode, "idle");
    });
  });

  describe("navigation survival (engine persists)", () => {
    it("re-initializing playback engine does not duplicate roots", () => {
      playItem(previewItem());
      initializePlaybackEngine();
      initializePlaybackEngine();
      const roots = document.querySelectorAll("#vitalforge-playback-root");
      assert.equal(roots.length, 1);
      assert.ok(globalPlayerEngine.isEngineMounted());
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, "regression::preview");
    });

    it("engine singleton survives simulated route change", () => {
      playItem(playableSet());
      const rootBefore = document.getElementById("vitalforge-playback-root");
      initializePlaybackEngine();
      const rootAfter = document.getElementById("vitalforge-playback-root");
      assert.equal(rootBefore, rootAfter);
      assert.equal(globalPlayerEngine.getSnapshot().currentTrack?.type, "set");
    });
  });

  describe("Fast Refresh simulation", () => {
    it("does not duplicate audio elements or iframes", () => {
      playItem(previewItem());
      initializePlaybackEngine();
      initializePlaybackEngine();
      const audios = document.querySelectorAll("audio");
      const iframes = document.querySelectorAll("#vitalforge-playback-root iframe");
      assert.ok(audios.length <= 1, `expected ≤1 audio, got ${audios.length}`);
      assert.ok(iframes.length <= 1, `expected ≤1 iframe, got ${iframes.length}`);
    });

    it("re-binds engine listener without duplicate transport writers", async () => {
      playItem(previewItem());
      await new Promise((r) => setTimeout(r, 20));
      const timeBefore = usePlaybackStore.getState().currentTime;
      initializePlaybackEngine();
      globalPlayerEngine.seek(12);
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(usePlaybackStore.getState().currentTime, 12);
      assert.notEqual(timeBefore, 12);
    });
  });

  describe("duplicate request prevention", () => {
    it("does not restart engine when same item already playing", async () => {
      const item = previewItem("-dedupe");
      playItem(item);
      await new Promise((r) => setTimeout(r, 25));
      const gen1 = globalPlayerEngine.getGeneration();
      playItem(item);
      assert.equal(globalPlayerEngine.getGeneration(), gen1);
    });

    it("ignores play while load in flight for same item", () => {
      const item = playableSet();
      mediaSessionController.play(item);
      const gen = globalPlayerEngine.getGeneration();
      mediaSessionController.play(item);
      assert.equal(globalPlayerEngine.getGeneration(), gen);
    });
  });

  describe("error recovery", () => {
    it("retryPlayback re-dispatches current item", () => {
      const item = previewItem("-retry");
      playItem(item);
      usePlaybackStore.setState({ error: "Embed failed to load" });
      const genBefore = globalPlayerEngine.getGeneration();
      retryPlayback();
      assert.equal(usePlaybackStore.getState().error, null);
      assert.ok(globalPlayerEngine.getGeneration() >= genBefore);
    });
  });

  describe("mobile viewport (singleton invariants)", () => {
    it("engine mount is independent of viewport width", () => {
      const originalInnerWidth = globalThis.innerWidth;
      Object.defineProperty(globalThis, "innerWidth", {
        value: 390,
        configurable: true,
      });
      try {
        playItem(previewItem("-mobile"));
        assert.equal(document.querySelectorAll("#vitalforge-playback-root").length, 1);
      } finally {
        Object.defineProperty(globalThis, "innerWidth", {
          value: originalInnerWidth,
          configurable: true,
        });
      }
    });
  });

  describe("persisted session hydration", () => {
    it("hydrating persisted playback does not recurse initializePlaybackEngine", () => {
      const item = previewItem("-persist");
      const storage = new Map<string, string>();
      const localStorage = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => storage.clear(),
        key: () => null,
        length: 0,
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: localStorage,
        configurable: true,
      });
      storage.set(
        "vitalforge:playback",
        JSON.stringify({
          current: item,
          isPlaying: true,
          position: 0,
          queue: [item],
          updatedAt: Date.now(),
        }),
      );

      __resetPlaybackModuleForTests();
      resetPlaybackForTests();

      assert.doesNotThrow(() => {
        initializePlaybackEngine();
      });
      assert.equal(usePlaybackStore.getState().currentTrack?.refId, item.refId);
    });
  });
});
