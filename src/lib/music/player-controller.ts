/**
 * PlayerController — stable UI-facing playback API.
 *
 * UI components MUST interact with playback only through this module (or playback-actions).
 * Never import global-player-engine, providers, or dispatch store transport actions directly.
 */
import {
  playItem,
  pause,
  resume,
  playNext,
  playPrevious,
  togglePlayback,
  openPlayerSurface,
  closePlayerSurface,
  expandPlayerSurface,
} from "@/lib/music/playback-actions";
import { mediaEngineEvents, type MediaEngineEvent } from "@/lib/music/media-engine-events";
import { mediaSessionController } from "@/lib/music/media-session-controller";

export type { MediaEngineEvent };
export { mediaEngineEvents };

let playerShellElement: HTMLElement | null = null;

/** @internal Register the player shell for view-only fullscreen toggling. */
export function registerPlayerShell(element: HTMLElement | null): void {
  playerShellElement = element;
}

async function requestShellFullscreen(): Promise<void> {
  const shell = playerShellElement;
  if (!shell?.requestFullscreen) return;
  if (document.fullscreenElement === shell) return;
  try {
    await shell.requestFullscreen();
  } catch {
    // blocked by browser policy
  }
}

async function exitShellFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // ignore
  }
}

export const playerController = {
  play: playItem,
  pause,
  resume,
  togglePlayPause: togglePlayback,
  next: playNext,
  prev: playPrevious,
  seek: (seconds: number) => mediaSessionController.commitSeek(seconds),
  skipForward: (seconds?: number) => mediaSessionController.skipForward(seconds ?? 10),
  skipBackward: (seconds?: number) => mediaSessionController.skipBackward(seconds ?? 10),
  openSurface: openPlayerSurface,
  closeSurface: closePlayerSurface,
  expandSurface: expandPlayerSurface,
  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === playerShellElement) {
      await exitShellFullscreen();
    } else {
      await requestShellFullscreen();
    }
  },
  async enterFullscreen(): Promise<void> {
    await requestShellFullscreen();
  },
  async exitFullscreen(): Promise<void> {
    await exitShellFullscreen();
  },
  /** Subscribe to MediaEngine lifecycle events (view-only). */
  subscribe: mediaEngineEvents.subscribe.bind(mediaEngineEvents),
} as const;
