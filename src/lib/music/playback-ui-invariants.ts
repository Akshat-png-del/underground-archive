import type { PlaybackItem } from "@/lib/music/playback";
import {
  playbackExperienceDatasetValue,
  resolvePlaybackExperience,
  type PlaybackExperience,
} from "@/lib/music/playback-experience";
import { isSetWatchDockActive } from "@/lib/sets/set-watch-dock";

const TAG = "[PLAYBACK UI]";

export interface PlaybackUiInvariantContext {
  experience: PlaybackExperience;
  activeTrack: PlaybackItem | null;
}

function isDev(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function fail(message: string): never {
  throw new Error(`${TAG} ${message}`);
}

function onSetWatchPage(): boolean {
  return !!document.querySelector("[data-set-watch-page]");
}

function audioBarVisible(): boolean {
  return !!document.querySelector("[data-audio-player]");
}

/** Dev-only: globals.css playback layout rules must reach the browser. */
export function assertPlaybackLayoutCssLoaded(): void {
  if (!isDev() || typeof document === "undefined") return;

  const probe = document.createElement("div");
  probe.className = "spotify-player-bar";
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "left:-9999px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const position = getComputedStyle(probe).position;
  probe.remove();

  if (position !== "fixed") {
    fail(
      "globals.css playback rules are missing in the browser (.spotify-player-bar is not position:fixed). " +
        "Restart with `npm run dev` (webpack). Do not use `next dev --turbo` until Turbopack CSS cache is fixed.",
    );
  }
}

/** Dev-only: exactly one engine host may exist. */
export function assertSinglePlaybackEngineHost(): void {
  if (!isDev() || typeof document === "undefined") return;

  const roots = document.querySelectorAll("#vitalforge-playback-root");
  if (roots.length !== 1) {
    fail(`expected exactly one #vitalforge-playback-root, found ${roots.length}`);
  }

  const canvases = document.querySelectorAll("#media-engine-canvas");
  if (canvases.length > 1) {
    fail(`expected at most one #media-engine-canvas, found ${canvases.length}`);
  }
}

/** Dev-only: audio bar must not render on set watch pages. */
export function assertAudioBarHiddenOnSetWatch(surface: string): void {
  if (!isDev() || typeof document === "undefined") return;
  if (onSetWatchPage() && audioBarVisible()) {
    fail(`${surface} — audio bar must not render on set watch page`);
  }
}

/** Dev-only: when set watch owns the dock, YouTube must render inside the watch host. */
export function assertYoutubeInsideWatchHost(): void {
  if (!isDev() || typeof document === "undefined") return;
  if (!isSetWatchDockActive()) return;

  const root = document.getElementById("vitalforge-playback-root");
  if (!root) return;

  const youtubeHost = root.querySelector("[data-youtube-embed-host], iframe[src*='youtube']");
  if (!youtubeHost) return;

  const watchHost = root.closest("[data-set-watch-host]");
  if (!watchHost) {
    fail("YouTube embed must render inside [data-set-watch-host] while set watch is active");
  }
}

/** Dev-only: document experience token must match the active playback item. */
export function assertPlaybackExperienceDocumentSync(ctx: PlaybackUiInvariantContext): void {
  if (!isDev() || typeof document === "undefined") return;

  const expected = playbackExperienceDatasetValue(ctx.experience);
  const actual = document.documentElement.dataset.playbackExperience;

  if (expected !== actual) {
    fail(
      `playback experience document sync failed (expected data-playback-experience=${expected ?? "unset"}, got ${actual ?? "unset"})`,
    );
  }
}

/** Dev-only: never surface audio and video experiences simultaneously. */
export function assertSinglePlaybackExperience(ctx: PlaybackUiInvariantContext): void {
  if (!isDev() || typeof document === "undefined") return;

  const videoActive = ctx.experience === "video" && !!ctx.activeTrack;
  const audioChromeActive = ctx.experience === "audio" && audioBarVisible();

  if (videoActive && audioChromeActive) {
    fail("audio and video playback experiences are active at the same time");
  }

  if (videoActive && onSetWatchPage() && document.documentElement.dataset.playbackExperience === "audio") {
    fail("video set watch is active while document still declares audio experience");
  }
}

/** Dev-only: UI surfaces must reflect the active experience. */
export function assertPlaybackUiExperienceSync(ctx: PlaybackUiInvariantContext): void {
  if (!isDev() || typeof document === "undefined") return;

  assertPlaybackExperienceDocumentSync(ctx);

  if (ctx.experience === "video" && ctx.activeTrack) {
    if (audioBarVisible()) {
      fail("video experience is active but the audio bar is visible");
    }
    if (onSetWatchPage() && isSetWatchDockActive()) {
      assertYoutubeInsideWatchHost();
    }
    return;
  }

  if (ctx.experience === "audio" && ctx.activeTrack) {
    if (onSetWatchPage() && audioBarVisible()) {
      fail("audio bar is visible on set watch page");
    }
    const resolved = resolvePlaybackExperience(ctx.activeTrack);
    if (resolved !== "audio") {
      fail("active track resolves to non-audio experience while audio UI is mounted");
    }
  }
}

export function assertPlaybackUiInvariants(ctx: PlaybackUiInvariantContext): void {
  if (!isDev() || typeof document === "undefined") return;

  assertPlaybackLayoutCssLoaded();
  assertSinglePlaybackEngineHost();
  assertSinglePlaybackExperience(ctx);
  assertPlaybackUiExperienceSync(ctx);
  assertAudioBarHiddenOnSetWatch("PlaybackUiInvariantGuard");
}
