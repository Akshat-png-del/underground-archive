/**
 * Playback Actions Layer
 *
 * All user-interaction playback decisions live here.
 * UI components dispatch actions — they never implement playback policy.
 */
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import { usePlaybackStore } from "@/stores/playback-store";
import { playbackDebugLog } from "@/lib/music/playback-debug";
import {
  isOnSetWatchPage,
  resolveSetWatchSlug,
  setWatchPath,
} from "@/lib/sets/set-watch-navigation";
import { warnIfAudioTransportInVideoContext } from "@/lib/music/playback-domain-lock";

function getStore() {
  return usePlaybackStore.getState();
}

function guardAudioTransport(action: string): void {
  warnIfAudioTransportInVideoContext(action, getStore().currentTrack);
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
  getStore().play(item, options);
}

/** Pause current playback. */
export function pause(): void {
  guardAudioTransport("pause");
  playbackDebugLog("CLICK", "pause");
  getStore().pause();
}

/** Resume current playback. */
export function resume(): void {
  guardAudioTransport("resume");
  playbackDebugLog("CLICK", "resume");
  getStore().resume();
}

/** Toggle pause/resume for the current item. */
export function togglePlayback(): void {
  guardAudioTransport("togglePlayback");
  playbackDebugLog("CLICK", "togglePlayback");
  getStore().togglePlayPause();
}

/** Open the video stage without changing transport. */
export function openPlayerSurface(): void {
  getStore().openDetails();
}

/** Hide the video stage without stopping playback. */
export function closePlayerSurface(): void {
  getStore().closeDetails();
}

/** Expand the video stage for the current item. */
export function expandPlayerSurface(): void {
  getStore().openDetails();
}

/** Seek forward by seconds (default 10). */
export function skipForward(seconds = 10): void {
  guardAudioTransport("skipForward");
  playbackDebugLog("CLICK", "skipForward", { seconds });
  getStore().skipForward(seconds);
}

/** Seek backward by seconds (default 10). */
export function skipBackward(seconds = 10): void {
  guardAudioTransport("skipBackward");
  playbackDebugLog("CLICK", "skipBackward", { seconds });
  getStore().skipBackward(seconds);
}

/** Set volume 0–1 (preview audio). */
export function setPlaybackVolume(volume: number): void {
  guardAudioTransport("setPlaybackVolume");
  getStore().setVolume(volume);
}

const DEFAULT_RESTORE_VOLUME = 0.8;

/** Toggle mute (preview audio). Restores the last non-zero volume when unmuting. */
export function togglePlaybackMute(): void {
  guardAudioTransport("togglePlaybackMute");
  playbackDebugLog("CLICK", "toggleMute");
  const store = getStore();
  if (store.muted) {
    const restore = store.volume > 0 ? store.volume : DEFAULT_RESTORE_VOLUME;
    store.setVolume(restore);
    return;
  }
  store.toggleMute();
}

/** Seek to position in seconds. */
export function seekTo(seconds: number): void {
  guardAudioTransport("seekTo");
  playbackDebugLog("CLICK", "seekTo", { seconds });
  getStore().seek(seconds);
}

/** Advance queue. */
export function playNext(): void {
  guardAudioTransport("playNext");
  playbackDebugLog("CLICK", "playNext");
  getStore().next();
}

/** Go back in queue or restart if near start. */
export function playPrevious(): void {
  guardAudioTransport("playPrevious");
  playbackDebugLog("CLICK", "playPrevious");
  getStore().previous();
}

/** Stop playback and clear session. */
export function stopPlayback(): void {
  getStore().stop();
}

/** Retry the current item after a transport error. */
export function retryPlayback(): void {
  const store = getStore();
  const item = store.currentTrack;
  if (!item) return;
  playbackDebugLog("ACTION", "retryPlayback", { refId: item.refId });
  const { queue, queueIndex } = store;
  store.play(item, { browse: { queue, queueIndex } });
}

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

  const store = getStore();
  const active = store.isActive(type, refId);

  playbackDebugLog("CLICK", "handlePlaybackSurfaceClick", {
    type,
    refId,
    active,
  });

  if (active) {
    store.togglePlayPause();
    return;
  }

  store.play(item, options);
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

  const store = getStore();
  if (!store.isActive(type, refId)) {
    store.play(item, options);
  }
  store.openDetails();
}
