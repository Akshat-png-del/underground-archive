/**
 * Playback engine stress test — validates generation-based race cancellation.
 *
 * Run: npm run stress:playback
 */
import { catalogTracks } from "../src/content/tracks";
import { archiveSets } from "../src/content/sets";
import { playbackItemFromTrack, playbackItemFromSet } from "../src/lib/music/playback";
import {
  globalPlayerEngine,
  __resetGlobalPlayerEngineForTests,
} from "../src/lib/music/global-player-engine";

interface StressResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: StressResult[] = [];

function assert(name: string, condition: boolean, detail: string): void {
  results.push({ name, passed: condition, detail });
  const icon = condition ? "✓" : "✗";
  console.log(`${icon} ${name}: ${detail}`);
}

function mockDom(): void {
  const g = globalThis as typeof globalThis & {
    document?: Document;
    HTMLElement?: typeof HTMLElement;
  };

  if (g.document?.getElementById) return;

  const elements = new Map<string, MockElement>();

  class MockElement {
    tagName: string;
    style = { cssText: "" };
    children: MockElement[] = [];
    parent: MockElement | null = null;
    attributes = new Map<string, string>();
    private listeners = new Map<string, Set<() => void>>();
    src = "";

    constructor(tagName: string) {
      this.tagName = tagName.toUpperCase();
    }

    setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }

    getAttribute(name: string): string | null {
      return this.attributes.get(name) ?? null;
    }

    appendChild(child: MockElement): MockElement {
      child.parent = this;
      this.children.push(child);
      return child;
    }

    addEventListener(event: string, handler: () => void): void {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(handler);
    }

    removeEventListener(event: string, handler: () => void): void {
      this.listeners.get(event)?.delete(handler);
    }

    emit(event: string): void {
      for (const handler of this.listeners.get(event) ?? []) handler();
    }

    pause(): void {
      this.emit("pause");
    }

    async play(): Promise<void> {
      this.emit("play");
    }

    load(): void {
      this.emit("loadedmetadata");
      this.emit("canplay");
    }

    removeAttribute(): void {}
  }

  class MockDocument {
    body = new MockElement("body");

    getElementById(id: string): MockElement | null {
      return elements.get(id) ?? null;
    }

    createElement(tag: string): MockElement {
      const el = new MockElement(tag);
      if (tag === "div") {
        const id = el.attributes.get("id");
        if (id) elements.set(id, el);
      }
      return el;
    }

    appendChild(el: MockElement): void {
      this.body.appendChild(el);
    }
  }

  const doc = new MockDocument();
  g.document = doc as unknown as Document;
  g.HTMLElement = MockElement as unknown as typeof HTMLElement;

  const originalCreate = doc.createElement.bind(doc);
  doc.createElement = (tag: string) => {
    const el = originalCreate(tag);
    if (tag === "div") {
      const setAttr = el.setAttribute.bind(el);
      el.setAttribute = (name: string, value: string) => {
        setAttr(name, value);
        if (name === "id") elements.set(value, el);
      };
    }
    if (tag === "iframe") {
      Object.defineProperty(el, "src", {
        set(value: string) {
          el.attributes.set("src", value);
          queueMicrotask(() => el.emit("load"));
        },
        get() {
          return el.attributes.get("src") ?? "";
        },
      });
    }
    return el;
  };
}

function stressRapidTrackSwitch(): void {
  __resetGlobalPlayerEngineForTests();
  mockDom();

  const tracks = catalogTracks.filter((t) => t.spotifyUrl).slice(0, 5);
  const sets = archiveSets.slice(0, 3);
  const items = [
    ...tracks.map(playbackItemFromTrack),
    ...sets.map(playbackItemFromSet),
  ];

  let lastPatch: { currentTrack?: { refId: string } | null; isPlaying?: boolean } = {};
  globalPlayerEngine.setStateListener((patch) => {
    lastPatch = { ...lastPatch, ...patch };
  });

  globalPlayerEngine.mount();

  for (const item of items) {
    globalPlayerEngine.play(item);
  }

  const lastItem = items[items.length - 1];
  const snapshot = globalPlayerEngine.getSnapshot();

  assert(
    "rapid-switch-final-track",
    snapshot.currentTrack?.refId === lastItem.refId,
    `expected ${lastItem.refId}, got ${snapshot.currentTrack?.refId ?? "null"}`,
  );

  assert(
    "rapid-switch-generation",
    globalPlayerEngine.getGeneration() >= items.length,
    `generation=${globalPlayerEngine.getGeneration()} expected >= ${items.length}`,
  );

  assert(
    "rapid-switch-no-stale-playing",
    lastPatch.currentTrack?.refId === lastItem.refId,
    "listener received stale track as final state",
  );
}

function stressRapidPauseResume(): void {
  __resetGlobalPlayerEngineForTests();
  mockDom();

  const set = archiveSets[0];
  const item = playbackItemFromSet(set);
  const states: boolean[] = [];

  globalPlayerEngine.setStateListener((patch) => {
    if (patch.isPlaying !== undefined) states.push(patch.isPlaying);
  });

  globalPlayerEngine.mount();
  globalPlayerEngine.play(item);

  globalPlayerEngine.pause();
  globalPlayerEngine.resume();
  globalPlayerEngine.pause();

  const snapshot = globalPlayerEngine.getSnapshot();
  assert(
    "pause-resume-ends-paused",
    snapshot.isPlaying === false,
    `isPlaying=${snapshot.isPlaying}`,
  );
}

function stressStopCancelsPending(): void {
  __resetGlobalPlayerEngineForTests();
  mockDom();

  const items = archiveSets.slice(0, 4).map(playbackItemFromSet);
  globalPlayerEngine.mount();

  for (const item of items) globalPlayerEngine.play(item);
  globalPlayerEngine.stop();

  const snapshot = globalPlayerEngine.getSnapshot();
  assert("stop-clears-track", snapshot.currentTrack === null, "track not cleared");
  assert("stop-not-playing", snapshot.isPlaying === false, "still playing after stop");
}

function main(): void {
  console.log("\n=== Playback Stress Test ===\n");
  stressRapidTrackSwitch();
  stressRapidPauseResume();
  stressStopCancelsPending();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  if (failed > 0) process.exit(1);
}

main();
