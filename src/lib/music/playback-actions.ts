/**
 * Playback Actions Layer
 *
 * Transport commands delegate to MediaSessionController (sole authority).
 * Chrome-only actions (detailsOpen) use the passive store mirror.
 */
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import { usePlaybackStore } from "@/stores/playback-store";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { playbackDebugLog } from "@/lib/music/playback-debug";
import {
  isOnSetWatchPage,
  resolveSetWatchSlug,
  setWatchPath,
} from "@/lib/sets/set-watch-navigation";
import { warnIfAudioTransportInVideoContext } from "@/lib/music/playback-domain-lock";

function guardAudioTransport(action: string): void {
  warnIfAudioTransportInVideoContext(action, mediaSessionController.getState().activeTrack);
}

let allowSetPlayOutsideWatchPage = false;

/** @internal Allow playItem(set) in tests outside /sets/[slug]. */
export function __allowSetPlayOutsideWatchPageForTests(allow: boolean): void {
  allowSetPlayOutsideWatchPage = allow;
}

/** @internal Reset action-layer state between tests. */
export function __resetPlaybackActionsForTests(): void {
  allowSetPlayOutsideWatchPage = false;
}

function redirectSetToWatchPage(refId: string, slug?: string | null): boolean {
  const resolved = resolveSetWatchSlug(refId, slug);
  if (!resolved || typeof window === "undefined") return false;
  if (isOnSetWatchPage(resolved)) return false;
  playbackDebugLog("CLICK", "redirect set to watch page", { refId, slug: resolved });
  window.location.href = setWatchPath(resolved);
  return true;
}

type PlayOptions = { browse?: PlaybackBrowseContext };

/** Start playback for an item (opens player surface). */
export function playItem(item: PlaybackItem, options?: PlayOptions): void {
  playbackDebugLog("CLICK", "playItem", { refId: item.refId, type: item.type });
  if (
    item.type === "set" &&
    !allowSetPlayOutsideWatchPage &&
    redirectSetToWatchPage(item.refId)
  ) {
    return;
  }
  mediaSessionController.play(item, options);
}

/** Pause current playback. */
export function pause(): void {
  guardAudioTransport("pause");
  playbackDebugLog("CLICK", "pause");
  mediaSessionController.pause();
}

/** Resume current playback. */
export function resume(): void {
  guardAudioTransport("resume");
  playbackDebugLog("CLICK", "resume");
  mediaSessionController.resume();
}

/** Toggle pause/resume for the current item. */
export function togglePlayback(): void {
  guardAudioTransport("togglePlayback");
  playbackDebugLog("CLICK", "togglePlayback");
  mediaSessionController.togglePlayPause();
}

/** Open the video stage without changing transport. */
export function openPlayerSurface(): void {
  usePlaybackStore.getState().openDetails();
}

/** Hide the video stage without stopping playback. */
export function closePlayerSurface(): void {
  usePlaybackStore.getState().closeDetails();
}

/** Expand the video stage for the current item. */
export function expandPlayerSurface(): void {
  usePlaybackStore.getState().openDetails();
}

/** Seek forward by seconds (default 10). */
export function skipForward(seconds = 10): void {
  guardAudioTransport("skipForward");
  playbackDebugLog("CLICK", "skipForward", { seconds });
  mediaSessionController.skipForward(seconds);
}

/** Seek backward by seconds (default 10). */
export function skipBackward(seconds = 10): void {
  guardAudioTransport("skipBackward");
  playbackDebugLog("CLICK", "skipBackward", { seconds });
  mediaSessionController.skipBackward(seconds);
}

/** Set volume 0–1 (preview audio). */
export function setPlaybackVolume(volume: number): void {
  guardAudioTransport("setPlaybackVolume");
  mediaSessionController.setVolume(volume);
}

/** Toggle mute (preview audio). */
export function togglePlaybackMute(): void {
  guardAudioTransport("togglePlaybackMute");
  playbackDebugLog("CLICK", "toggleMute");
  mediaSessionController.toggleMute();
}

/** Seek to position in seconds. */
export function seekTo(seconds: number): void {
  guardAudioTransport("seekTo");
  playbackDebugLog("CLICK", "seekTo", { seconds });
  mediaSessionController.commitSeek(seconds);
}

/** Advance queue. */
export function playNext(): void {
  guardAudioTransport("playNext");
  playbackDebugLog("CLICK", "playNext");
  mediaSessionController.next();
}

/** Go back in queue or restart if near start. */
export function playPrevious(): void {
  guardAudioTransport("playPrevious");
  playbackDebugLog("CLICK", "playPrevious");
  mediaSessionController.prev();
}

/** Stop playback and clear session. */
export function stopPlayback(): void {
  mediaSessionController.stop();
}

/** Retry the current item after a transport error. */
export function retryPlayback(): void {
  playbackDebugLog("ACTION", "retryPlayback");
  mediaSessionController.retry();
}

/** Thin controller delegates — no store transport logic. */
export const playbackActions = {
  play: (item: PlaybackItem, options?: PlayOptions) => mediaSessionController.play(item, options),
  pause: () => mediaSessionController.pause(),
  resume: () => mediaSessionController.resume(),
  seek: (seconds: number) => mediaSessionController.commitSeek(seconds),
  setVolume: (volume: number) => mediaSessionController.setVolume(volume),
  toggleMute: () => mediaSessionController.toggleMute(),
  next: () => mediaSessionController.next(),
  prev: () => mediaSessionController.prev(),
  stop: () => mediaSessionController.stop(),
  togglePlayPause: () => mediaSessionController.togglePlayPause(),
};

/**
 * Standard card/row click policy:
 * - inactive item → play
 * - active item → toggle pause/resume
 */
export function handlePlaybackSurfaceClick(
  item: PlaybackItem,
  type: LibraryItemType,
  refId: string,
  options?: PlayOptions,
): void {
  if (type === "set" && redirectSetToWatchPage(refId)) {
    return;
  }

  const active = mediaSessionController.isActive(type, refId);

  playbackDebugLog("CLICK", "handlePlaybackSurfaceClick", {
    type,
    refId,
    active,
  });

  if (active) {
    mediaSessionController.togglePlayPause();
    return;
  }

  mediaSessionController.play(item, options);
}

/**
 * Expand/open player for an item — starts playback if not already active.
 */
export function expandPlaybackSurface(
  item: PlaybackItem,
  type: LibraryItemType,
  refId: string,
  options?: PlayOptions,
): void {
  if (type === "set" && redirectSetToWatchPage(refId)) {
    return;
  }

  if (!mediaSessionController.isActive(type, refId)) {
    mediaSessionController.play(item, options);
  }
  usePlaybackStore.getState().openDetails();
}
