/**
 * Render-level arbitration — resolves competing controller updates into one UI snapshot.
 * Does not read providers or engine directly; consumes MediaSessionController state only.
 */
import type { PlaybackItem } from "@/lib/music/playback";
import {
  mediaSessionDisplayTime,
  type MediaSessionState,
} from "@/lib/music/media-session-controller";
import {
  reconcileDisplayDuration,
  reconcileDisplayPlaying,
  reconcileDisplayBuffering,
  reconcileDisplayTime,
  isMicroTimeOnlyDelta,
  UI_FRAME_COLLAPSE_MS,
  UI_INTERP_STEP_S,
  UI_PLAYING_HOLDOVER_MS,
  UI_SEEK_JUMP_THRESHOLD_S,
} from "@/lib/music/media-ui-smoothing";

/** Freeze micro-updates during unstable transport (buffer / seek / load bursts). */
export const RENDER_FREEZE_MS = 100;

export interface FinalPlaybackSnapshot {
  /** Arbitrated display position — alias: currentTime */
  displayTime: number;
  /** UI transport time (same as displayTime) */
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isScrubbing: boolean;
  activeTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  error: string | null;
  isBuffering: boolean;
  isInitialLoading: boolean;
  /** Buffering or initial load — alias for legacy UI */
  isLoading: boolean;
  isSeeking: boolean;
  volume: number;
  muted: boolean;
}

export type RenderArbiterState = {
  trackId: string | null;
  displayTime: number;
  stableDisplayTime: number;
  duration: number;
  isPlaying: boolean;
  playingHoldUntil: number;
  frozenUntil: number;
  lastPlayingIntent: boolean;
  stableBuffering: boolean;
  bufferingPending: boolean | null;
  bufferingSettleUntil: number;
  stableInitialLoading: boolean;
};

export function createRenderArbiter(): RenderArbiterState {
  return {
    trackId: null,
    displayTime: 0,
    stableDisplayTime: 0,
    duration: 0,
    isPlaying: false,
    playingHoldUntil: 0,
    frozenUntil: 0,
    lastPlayingIntent: false,
    stableBuffering: false,
    bufferingPending: null,
    bufferingSettleUntil: 0,
    stableInitialLoading: false,
  };
}

function buildSnapshot(
  session: MediaSessionState,
  displayTime: number,
  duration: number,
  isPlaying: boolean,
  isScrubbing: boolean,
  transportUi?: { isBuffering: boolean; isInitialLoading: boolean },
): FinalPlaybackSnapshot {
  const isBuffering = transportUi?.isBuffering ?? session.isBuffering;
  const isInitialLoading = transportUi?.isInitialLoading ?? session.isInitialLoading;
  const isLoading = isBuffering || isInitialLoading;
  return {
    displayTime,
    currentTime: displayTime,
    duration,
    isPlaying,
    isScrubbing,
    isLoading,
    activeTrack: session.activeTrack,
    queue: session.queue,
    queueIndex: session.queueIndex,
    error: session.error,
    isBuffering,
    isInitialLoading,
    isSeeking: session.isSeeking,
    volume: session.volume,
    muted: session.muted,
  };
}

function transportUiFields(arbiter: RenderArbiterState): {
  isBuffering: boolean;
  isInitialLoading: boolean;
} {
  return {
    isBuffering: arbiter.stableBuffering,
    isInitialLoading: arbiter.stableInitialLoading,
  };
}

function reconcileArbiterBuffering(arbiter: RenderArbiterState, session: MediaSessionState, now: number): void {
  const buffering = reconcileDisplayBuffering(
    session.isBuffering,
    arbiter.stableBuffering,
    arbiter.bufferingPending,
    arbiter.bufferingSettleUntil,
    now,
  );
  arbiter.stableBuffering = buffering.stable;
  arbiter.bufferingPending = buffering.pending;
  arbiter.bufferingSettleUntil = buffering.settleUntil;
  if (session.isInitialLoading) {
    arbiter.stableInitialLoading = true;
  } else if (!session.isBuffering && !buffering.pending) {
    arbiter.stableInitialLoading = false;
  }
}

function resetArbiterForTrack(arbiter: RenderArbiterState, session: MediaSessionState, now: number): void {
  const trackId = session.activeTrack?.refId ?? null;
  arbiter.trackId = trackId;
  arbiter.displayTime = session.currentTime;
  arbiter.stableDisplayTime = session.currentTime;
  arbiter.duration = Math.max(0, session.duration);
  arbiter.isPlaying = session.isPlaying;
  arbiter.playingHoldUntil = session.isPlaying ? now + UI_PLAYING_HOLDOVER_MS : 0;
  arbiter.frozenUntil = 0;
  arbiter.lastPlayingIntent = session.isPlaying;
  arbiter.stableBuffering = session.isBuffering;
  arbiter.bufferingPending = null;
  arbiter.bufferingSettleUntil = 0;
  arbiter.stableInitialLoading = session.isInitialLoading;
}

/** Merge queued controller updates into a single render-safe snapshot. */
export function resolveFinalRenderSnapshot(
  arbiter: RenderArbiterState,
  session: MediaSessionState,
  now: number,
): FinalPlaybackSnapshot {
  const trackId = session.activeTrack?.refId ?? null;
  const isScrubbing = session.isSeeking || session.hoverPreviewTime !== null;

  if (trackId !== arbiter.trackId) {
    resetArbiterForTrack(arbiter, session, now);
    return buildSnapshot(
      session,
      arbiter.displayTime,
      arbiter.duration,
      arbiter.isPlaying,
      isScrubbing,
      transportUiFields(arbiter),
    );
  }

  // Priority 1 — scrub state always wins.
  if (isScrubbing) {
    const scrubTime = mediaSessionDisplayTime(session);
    arbiter.displayTime = scrubTime;
    arbiter.stableDisplayTime = scrubTime;
    arbiter.frozenUntil = now + RENDER_FREEZE_MS;
    return buildSnapshot(session, scrubTime, arbiter.duration, arbiter.isPlaying, true, transportUiFields(arbiter));
  }

  const unstable =
    session.isBuffering || session.isSeeking || session.isInitialLoading;
  const intentChanged = session.isPlaying !== arbiter.lastPlayingIntent;

  if (unstable || intentChanged) {
    arbiter.frozenUntil = Math.max(arbiter.frozenUntil, now + RENDER_FREEZE_MS);
  }
  arbiter.lastPlayingIntent = session.isPlaying;

  reconcileArbiterBuffering(arbiter, session, now);

  const frozen = now < arbiter.frozenUntil;
  if (frozen) {
    return buildSnapshot(
      session,
      arbiter.displayTime,
      arbiter.duration,
      arbiter.isPlaying,
      false,
      transportUiFields(arbiter),
    );
  }

  // Priority 2–3 — controller reconciled time + stable display floor.
  const target = session.currentTime;
  const inStabilization = unstable;
  const allowJump =
    Math.abs(target - arbiter.displayTime) >= UI_SEEK_JUMP_THRESHOLD_S ||
    Math.abs(target - arbiter.stableDisplayTime) >= UI_SEEK_JUMP_THRESHOLD_S;

  let nextTime = reconcileDisplayTime(arbiter.displayTime, target, allowJump, {
    inStabilization,
  });

  if (!allowJump && session.isPlaying) {
    if (inStabilization && nextTime <= arbiter.displayTime) {
      nextTime = Math.min(
        target + UI_SEEK_JUMP_THRESHOLD_S,
        arbiter.displayTime + UI_INTERP_STEP_S,
      );
    } else if (nextTime < target) {
      nextTime = Math.min(target, nextTime + UI_INTERP_STEP_S);
    }
  }

  arbiter.displayTime = nextTime;
  arbiter.stableDisplayTime = allowJump ? target : Math.max(arbiter.stableDisplayTime, nextTime);
  arbiter.duration = reconcileDisplayDuration(
    arbiter.duration,
    session.duration,
    session.isBuffering,
  );

  const playing = reconcileDisplayPlaying(
    session.isPlaying,
    session.isBuffering,
    arbiter.isPlaying,
    arbiter.playingHoldUntil,
    now,
  );
  arbiter.isPlaying = playing.isPlaying;
  arbiter.playingHoldUntil = playing.holdUntilMs;
  if (session.isPlaying && session.isBuffering) {
    arbiter.playingHoldUntil = Math.max(arbiter.playingHoldUntil, now + UI_PLAYING_HOLDOVER_MS);
  }

  const duration =
    arbiter.duration > 0
      ? arbiter.duration
      : session.duration > 0
        ? session.duration
        : 0;

  return buildSnapshot(
    session,
    arbiter.displayTime,
    duration,
    arbiter.isPlaying,
    false,
    transportUiFields(arbiter),
  );
}

/** Frame output gate — collapses rapid time-only commits. */
export type OutputGateState = {
  lastCommitMs: number;
};

export function createOutputGate(): OutputGateState {
  return {
    lastCommitMs: 0,
  };
}

export type OutputCommitResult =
  | { kind: "skip"; snapshot: FinalPlaybackSnapshot }
  | { kind: "commit"; snapshot: FinalPlaybackSnapshot };

/** Apply final UI-only stabilization before React commit. */
export function stabilizeOutputCommit(
  gate: OutputGateState,
  committed: FinalPlaybackSnapshot,
  resolved: FinalPlaybackSnapshot,
  now: number,
): OutputCommitResult {
  const next = resolved;

  if (
    gate.lastCommitMs > 0 &&
    now - gate.lastCommitMs < UI_FRAME_COLLAPSE_MS &&
    isMicroTimeOnlyDelta(committed, next)
  ) {
    const merged = {
      ...committed,
      displayTime: next.displayTime,
      currentTime: next.currentTime,
    };
    return { kind: "skip", snapshot: merged };
  }

  gate.lastCommitMs = now;
  return { kind: "commit", snapshot: next };
}

export function initialFinalPlaybackSnapshot(session: MediaSessionState): FinalPlaybackSnapshot {
  const arbiter = createRenderArbiter();
  resetArbiterForTrack(arbiter, session, performance.now());
  return resolveFinalRenderSnapshot(arbiter, session, performance.now());
}

export function finalSnapshotsEqual(a: FinalPlaybackSnapshot, b: FinalPlaybackSnapshot): boolean {
  return (
    a.displayTime === b.displayTime &&
    a.currentTime === b.currentTime &&
    a.duration === b.duration &&
    a.isPlaying === b.isPlaying &&
    a.isScrubbing === b.isScrubbing &&
    a.activeTrack?.refId === b.activeTrack?.refId &&
    a.queueIndex === b.queueIndex &&
    a.queue.length === b.queue.length &&
    a.error === b.error &&
    a.isBuffering === b.isBuffering &&
    a.isInitialLoading === b.isInitialLoading &&
    a.isLoading === b.isLoading &&
    a.isSeeking === b.isSeeking &&
    a.volume === b.volume &&
    a.muted === b.muted
  );
}
