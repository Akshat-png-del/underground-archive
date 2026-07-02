"use client";

import { useSyncExternalStore } from "react";
import {
  mediaSessionController,
  type MediaSessionState,
} from "@/lib/music/media-session-controller";
import type { FinalPlaybackSnapshot } from "@/lib/music/final-playback-snapshot";

let committedSnapshot = toFinalSnapshot(mediaSessionController.getSnapshot());
let subscriberCount = 0;
let controllerUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();

function toFinalSnapshot(session: MediaSessionState): FinalPlaybackSnapshot {
  const isScrubbing = session.isSeeking || session.hoverPreviewTime !== null;
  const isLoading = session.isBuffering || session.isInitialLoading;

  return {
    displayTime: session.currentTime,
    currentTime: session.currentTime,
    duration: session.duration,
    isPlaying: session.isPlaying,
    isScrubbing,
    activeTrack: session.activeTrack,
    queue: session.queue,
    queueIndex: session.queueIndex,
    error: session.error,
    isBuffering: session.isBuffering,
    isInitialLoading: session.isInitialLoading,
    isLoading,
    isSeeking: session.isSeeking,
    volume: session.volume,
    muted: session.muted,
  };
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function commitFrame(): void {
  committedSnapshot = toFinalSnapshot(mediaSessionController.getSnapshot());
  notifyListeners();
}

function onControllerUpdate(): void {
  commitFrame();
}

function ensureLoop(): void {
  if (controllerUnsub) return;
  controllerUnsub = mediaSessionController.subscribe(onControllerUpdate);
}

function stopLoopIfIdle(): void {
  if (subscriberCount > 0) return;
  controllerUnsub?.();
  controllerUnsub = null;
}

function subscribe(listener: () => void): () => void {
  subscriberCount += 1;
  listeners.add(listener);
  ensureLoop();
  commitFrame();
  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    stopLoopIfIdle();
  };
}

function getSnapshot(): FinalPlaybackSnapshot {
  return committedSnapshot;
}

function getServerSnapshot(): FinalPlaybackSnapshot {
  return committedSnapshot;
}

/**
 * Read-only React gate for player chrome — mirrors MediaSessionController state.
 */
export function useFinalPlaybackSnapshot(): FinalPlaybackSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** @internal Test reset — keeps singleton in sync after harness reset. */
export function __resetFinalPlaybackSnapshotForTests(): void {
  committedSnapshot = toFinalSnapshot(mediaSessionController.getSnapshot());
  notifyListeners();
}
