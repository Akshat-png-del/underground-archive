"use client";

import { useSyncExternalStore } from "react";
import {
  mediaSessionController,
  mediaSessionDisplayTime,
  type MediaSessionState,
} from "@/lib/music/media-session-controller";
import { globalPlayerEngine } from "@/lib/music/global-player-engine";
import type { FinalPlaybackSnapshot } from "@/lib/music/final-playback-snapshot";
import { syncAuditRecord } from "@/lib/music/playback-sync-audit";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";
import { playPausePipelineTrace } from "@/lib/music/play-pause-pipeline-trace";
import { hydrationPipelineTrace } from "@/lib/music/hydration-pipeline-trace";

let subscriberCount = 0;
let controllerUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();

let prevControllerPhase = false;
let awaitingEngineChangeSinceSeek = false;

function toFinalSnapshot(session: MediaSessionState): FinalPlaybackSnapshot {
  const engine = globalPlayerEngine.getSnapshot();

  const controllerPhase = session.isSeeking || session.seekPreviewTime !== null;
  if (controllerPhase) {
    // While controller is active, UI is controller-driven.
    awaitingEngineChangeSinceSeek = false;
  } else if (prevControllerPhase && !controllerPhase) {
    // Keep controller authority until engine reaches the committed seek position.
    awaitingEngineChangeSinceSeek = true;
  }

  const source: "controller" | "engine" =
    controllerPhase || awaitingEngineChangeSinceSeek ? "controller" : "engine";

  // Once engine reaches the committed transport position, switch to engine authority.
  if (
    awaitingEngineChangeSinceSeek &&
    Math.abs(engine.currentTime - session.currentTime) <= 0.5
  ) {
    awaitingEngineChangeSinceSeek = false;
  }

  const resolvedTime =
    source === "controller"
      ? mediaSessionDisplayTime(session.currentTime, session)
      : Math.max(0, engine.currentTime);
  const resolvedDuration = engine.duration;
  const isScrubbing = session.isSeeking || session.hoverPreviewTime !== null;
  const isLoading = session.isBuffering || session.isInitialLoading;

  const snapshot: FinalPlaybackSnapshot = {
    displayTime: resolvedTime,
    currentTime: resolvedTime,
    duration: resolvedDuration,
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

  prevControllerPhase = controllerPhase;

  queuePipelineTrace({
    fn: "useFinalPlaybackSnapshot.toFinalSnapshot",
    phase: "commit",
    mscActiveTrack: session.activeTrack?.refId ?? null,
    engineActiveTrack: engine.currentTrack?.refId ?? null,
    snapshotActiveTrack: snapshot.activeTrack?.refId ?? null,
    mscQueueIndex: session.queueIndex,
    snapshotQueueIndex: snapshot.queueIndex,
    trackChanged: session.activeTrack?.refId !== engine.currentTrack?.refId,
  });

  syncAuditRecord({
    ts: Date.now(),
    action: "snapshot-commit",
    layer: "snapshot",
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    isPlaying: snapshot.isPlaying,
    volume: snapshot.volume,
    muted: snapshot.muted,
    isLoading: snapshot.isLoading,
    currentTrack: snapshot.activeTrack?.refId ?? null,
    extra: {
      displayTime: snapshot.displayTime,
      source,
      isSeeking: snapshot.isSeeking,
      isScrubbing: snapshot.isScrubbing,
      engineCurrentTime: engine.currentTime,
      mscCurrentTime: session.currentTime,
    },
  });

  return snapshot;
}

let committedSnapshot = toFinalSnapshot(mediaSessionController.getSnapshot());

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function snapshotsEqual(a: FinalPlaybackSnapshot, b: FinalPlaybackSnapshot): boolean {
  return (
    a.activeTrack?.refId === b.activeTrack?.refId &&
    a.queueIndex === b.queueIndex &&
    a.isPlaying === b.isPlaying &&
    a.isSeeking === b.isSeeking &&
    a.isScrubbing === b.isScrubbing &&
    a.isLoading === b.isLoading &&
    a.error === b.error &&
    a.volume === b.volume &&
    a.muted === b.muted &&
    Math.abs(a.duration - b.duration) < 0.001 &&
    Math.abs(a.displayTime - b.displayTime) < 0.05
  );
}

function commitFrame(): void {
  const prior = committedSnapshot;
  const next = toFinalSnapshot(mediaSessionController.getSnapshot());
  if (snapshotsEqual(prior, next)) {
    if (typeof window !== "undefined") {
      const w = window as Window & { __playbackPerf?: { snapshotCommits: number; snapshotSkipped: number } };
      if (!w.__playbackPerf) w.__playbackPerf = { snapshotCommits: 0, snapshotSkipped: 0 };
      w.__playbackPerf.snapshotSkipped += 1;
    }
    return;
  }
  committedSnapshot = next;
  if (typeof window !== "undefined") {
    const w = window as Window & { __playbackPerf?: { snapshotCommits: number; snapshotSkipped: number } };
    if (!w.__playbackPerf) w.__playbackPerf = { snapshotCommits: 0, snapshotSkipped: 0 };
    w.__playbackPerf.snapshotCommits += 1;
  }
  if (prior.isPlaying !== committedSnapshot.isPlaying) {
    playPausePipelineTrace({
      fn: "useFinalPlaybackSnapshot.commitFrame",
      phase: "snapshot_commit",
      event: committedSnapshot.isPlaying ? "play" : "pause",
      snapshotIsPlaying: committedSnapshot.isPlaying,
      mscIsPlaying: committedSnapshot.isPlaying,
      activeTrack: committedSnapshot.activeTrack?.refId ?? null,
      extra: { priorIsPlaying: prior.isPlaying },
    });
  }
  if (
    prior.activeTrack?.refId !== committedSnapshot.activeTrack?.refId ||
    prior.queueIndex !== committedSnapshot.queueIndex ||
    (prior.currentTime === 0 && committedSnapshot.currentTime > 0 && prior.activeTrack === null)
  ) {
    hydrationPipelineTrace({
      fn: "useFinalPlaybackSnapshot",
      phase: "snapshot_commit",
      snapshot: {
        activeTrack: committedSnapshot.activeTrack?.refId ?? null,
        queueLength: committedSnapshot.queue.length,
        queueIndex: committedSnapshot.queueIndex,
        currentTime: committedSnapshot.currentTime,
        duration: committedSnapshot.duration,
        isPlaying: committedSnapshot.isPlaying,
        volume: committedSnapshot.volume,
        muted: committedSnapshot.muted,
      },
      extra: {
        priorActiveTrack: prior.activeTrack?.refId ?? null,
        priorQueueIndex: prior.queueIndex,
        priorCurrentTime: prior.currentTime,
      },
    });
  }
  if (
    prior.displayTime !== committedSnapshot.displayTime ||
    prior.isSeeking !== committedSnapshot.isSeeking
  ) {
    seekPipelineTrace("useFinalPlaybackSnapshot.commitFrame", "STATE", {
      displayTime: committedSnapshot.displayTime,
      priorDisplayTime: prior.displayTime,
      isSeeking: committedSnapshot.isSeeking,
      isScrubbing: committedSnapshot.isScrubbing,
      duration: committedSnapshot.duration,
    });
  }
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
 * Read-only React gate for player chrome — one time source per frame.
 * Interaction: controller display time. Playback: engine time.
 */
export function useFinalPlaybackSnapshot(): FinalPlaybackSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** @internal Audit read — returns last committed snapshot without subscribing. */
export function __getCommittedPlaybackSnapshotForAudit(): FinalPlaybackSnapshot {
  return committedSnapshot;
}

/** @internal Test reset — keeps singleton in sync after harness reset. */
export function __resetFinalPlaybackSnapshotForTests(): void {
  committedSnapshot = toFinalSnapshot(mediaSessionController.getSnapshot());
  prevControllerPhase = false;
  awaitingEngineChangeSinceSeek = false;
  notifyListeners();
}
