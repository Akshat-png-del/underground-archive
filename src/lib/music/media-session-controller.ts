/**
 * MediaSessionController — single source of truth for all playback state.
 *
 * Flow: UI → MediaSessionController → GlobalPlayerEngine → ProviderRouter → providers
 * Return: provider → engine snapshot → controller → subscribers + Zustand mirror (read-only cache)
 */
import type { LibraryItemType } from "@/types/library";
import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import {
  hydratePlaybackItem,
  hydratePlaybackQueue,
  isSamePlaybackItem,
} from "@/lib/music/playback";
import {
  globalPlayerEngine,
  type PlayerEngineState,
} from "@/lib/music/global-player-engine";
import {
  usePlaybackStore,
  schedulePlaybackPersist,
  getPlaybackRecordFn,
  ensurePlaybackEngineReady,
} from "@/stores/playback-store";
import { clampPlaybackPosition, shouldAcceptPositionAfterSeek } from "@/lib/music/audio-transport-sync";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { playbackDebugLog, playbackDebugWarn } from "@/lib/music/playback-debug";
import { warnIfAudioTransportInVideoContext } from "@/lib/music/playback-domain-lock";
import { logStateSync } from "@/lib/music/media-binding-debug";
import { clearPersistedPlayback } from "@/lib/music/playback-persistence";

export interface MediaSessionState {
  activeTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isInitialLoading: boolean;
  volume: number;
  muted: boolean;
  error: string | null;
  isSeeking: boolean;
  seekPreviewTime: number | null;
  /** Hover-only scrub preview — never committed until drag/release. */
  hoverPreviewTime: number | null;
}

type PlayOptions = {
  queue?: PlaybackItem[];
  queueIndex?: number;
  browse?: PlaybackBrowseContext;
};

type Listener = () => void;

const EMPTY: MediaSessionState = {
  activeTrack: null,
  queue: [],
  queueIndex: 0,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isBuffering: false,
  isInitialLoading: false,
  volume: 1,
  muted: false,
  error: null,
  isSeeking: false,
  seekPreviewTime: null,
  hoverPreviewTime: null,
};

const SEEK_LOCK_MS = 850;
const DURATION_SIGNIFICANT_DELTA_S = 2;
const TIME_BACKWARD_EPSILON_S = 0.08;
/** Reject provider play/pause oscillation inside this window. */
const TRANSPORT_FLIP_GUARD_MS = 250;
/** Max forward drift per reconcile tick while holding stable time during buffer/seek. */
const TIME_INTERP_CAP_S = 0.5;

function guard(action: string, track: PlaybackItem | null): void {
  warnIfAudioTransportInVideoContext(action, track);
}

function resolveBrowseSession(
  item: PlaybackItem,
  options?: PlayOptions,
): { queue: PlaybackItem[]; queueIndex: number } {
  const queue = options?.browse?.queue ?? options?.queue;
  const explicitIndex = options?.browse?.queueIndex ?? options?.queueIndex;

  if (queue && queue.length > 0) {
    const queueIndex =
      explicitIndex !== undefined && explicitIndex >= 0 && explicitIndex < queue.length
        ? explicitIndex
        : queue.findIndex((entry) => isSamePlaybackItem(entry, item));
    return { queue, queueIndex: queueIndex >= 0 ? queueIndex : 0 };
  }

  return { queue: [item], queueIndex: 0 };
}

/** Display position for progress UI — drag preview, then hover preview, then transport time. */
export function mediaSessionDisplayTime(state: MediaSessionState): number {
  if (state.isSeeking && state.seekPreviewTime !== null) {
    return state.seekPreviewTime;
  }
  if (!state.isSeeking && state.hoverPreviewTime !== null) {
    return state.hoverPreviewTime;
  }
  return state.currentTime;
}

type StableSnapshotInput = {
  snapshot: PlayerEngineState;
  prior: MediaSessionState;
  trackChanged: boolean;
  hadTrackBefore: boolean;
  transportIntent: "playing" | "paused";
  pendingSeekSeconds: number | null;
  pendingSeekDeadline: number;
  seekLockUntil: number;
  playbackFloorTime: number;
  stableDuration: number;
  lastReconcileAtMs: number;
};

type StableSnapshotResult = {
  activeTrack: PlaybackItem | null;
  queueIndex: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isInitialLoading: boolean;
  error: string | null;
  isSeeking: boolean;
  seekPreviewTime: number | null;
  hoverPreviewTime: number | null;
  playbackFloorTime: number;
  stableDuration: number;
  transportIntent: "playing" | "paused";
  clearPendingSeek: boolean;
};

/**
 * Playback reconciliation gate — filters provider/engine reports before they touch session state.
 * Volume/mute are controller-owned and never read from providers.
 */
function createStableMediaSnapshot(input: StableSnapshotInput): StableSnapshotResult {
  const {
    snapshot,
    prior,
    trackChanged,
    hadTrackBefore,
    transportIntent,
    pendingSeekSeconds,
    pendingSeekDeadline,
    seekLockUntil,
    playbackFloorTime,
    stableDuration,
    lastReconcileAtMs,
  } = input;

  const providerTime = snapshot.currentTime;
  const providerDuration = snapshot.duration;
  const isBuffering = snapshot.isLoading;
  const now = Date.now();
  const inSeekLock = now < seekLockUntil;
  const inSeekSettle = pendingSeekSeconds !== null;
  const reconcileElapsedS =
    lastReconcileAtMs > 0 ? Math.min((now - lastReconcileAtMs) / 1000, TIME_INTERP_CAP_S) : 0;

  const positionDecision = shouldAcceptPositionAfterSeek(
    providerTime,
    pendingSeekSeconds,
    pendingSeekDeadline,
  );

  let queueIndex = prior.queueIndex;
  if (trackChanged && snapshot.currentTrack) {
    const matched = prior.queue.findIndex((entry) =>
      isSamePlaybackItem(entry, snapshot.currentTrack!),
    );
    if (matched >= 0) queueIndex = matched;
  }

  // ── currentTime ──────────────────────────────────────────────────────────
  let currentTime = prior.currentTime;

  if (trackChanged) {
    currentTime = Math.max(0, providerTime);
  } else if (prior.isSeeking && prior.seekPreviewTime !== null) {
    currentTime = prior.currentTime;
  } else if (inSeekLock && pendingSeekSeconds !== null) {
    currentTime = pendingSeekSeconds;
  } else if (inSeekSettle && !positionDecision.accept) {
    currentTime = pendingSeekSeconds ?? prior.currentTime;
  } else if (positionDecision.accept) {
    const candidate = Math.max(providerTime, playbackFloorTime);
    currentTime = candidate;
  } else {
    currentTime = Math.max(providerTime, playbackFloorTime);
    if (transportIntent === "playing" && !prior.isSeeking && isBuffering && reconcileElapsedS > 0) {
      const cap = prior.duration > 0 ? prior.duration : prior.currentTime + reconcileElapsedS;
      currentTime = Math.min(cap, currentTime + reconcileElapsedS);
    }
  }

  if (
    !trackChanged &&
    !prior.isSeeking &&
    !inSeekLock &&
    providerTime + TIME_BACKWARD_EPSILON_S < currentTime
  ) {
    currentTime = Math.max(currentTime, playbackFloorTime);
  }

  const nextPlaybackFloorTime = trackChanged
    ? currentTime
    : Math.max(playbackFloorTime, currentTime);

  // ── duration (stable per track — same trackId only, significant delta or first load) ─
  let duration = prior.duration;
  let nextStableDuration = stableDuration;

  if (trackChanged) {
    duration = providerDuration > 0 ? providerDuration : 0;
    nextStableDuration = duration;
  } else if (providerDuration > 0) {
    const baseline = Math.max(stableDuration, prior.duration);
    if (baseline <= 0) {
      duration = providerDuration;
      nextStableDuration = providerDuration;
    } else if (Math.abs(providerDuration - baseline) > DURATION_SIGNIFICANT_DELTA_S) {
      duration = providerDuration;
      nextStableDuration = providerDuration;
    } else {
      duration = baseline;
      nextStableDuration = baseline;
    }
  } else if (isBuffering) {
    duration = Math.max(stableDuration, prior.duration);
    nextStableDuration = duration;
  }

  // ── isPlaying — transportIntent is sole authority; provider cannot override ─
  const isPlaying = transportIntent === "playing" && !snapshot.error;

  const initialLoad =
    trackChanged ||
    (!hadTrackBefore && !!snapshot.currentTrack) ||
    (isBuffering && prior.currentTime === 0 && providerTime === 0);

  let isSeeking = prior.isSeeking;
  let seekPreviewTime = prior.seekPreviewTime;

  if (!prior.isSeeking) {
    // keep authority time
  } else if (positionDecision.accept && pendingSeekSeconds === null) {
    isSeeking = false;
    seekPreviewTime = null;
    currentTime = Math.max(currentTime, providerTime);
  }

  return {
    activeTrack: snapshot.currentTrack,
    queueIndex,
    currentTime,
    duration,
    isPlaying,
    isBuffering,
    isInitialLoading: initialLoad && isBuffering,
    error: snapshot.error,
    isSeeking,
    seekPreviewTime,
    hoverPreviewTime: prior.isSeeking ? null : prior.hoverPreviewTime,
    playbackFloorTime: nextPlaybackFloorTime,
    stableDuration: nextStableDuration,
    transportIntent,
    clearPendingSeek: positionDecision.clearPending,
  };
}

class MediaSessionController {
  private state: MediaSessionState = { ...EMPTY };
  private listeners = new Set<Listener>();
  private engineAttached = false;

  private pendingSeekSeconds: number | null = null;
  private pendingSeekDeadline = 0;
  private wasPlayingAtSeek = false;
  private hadTrackBefore = false;
  private lastAudibleVolume = 0.8;
  private pendingPlayItem: PlaybackItem | null = null;
  /** User transport intent — controller authority; provider reports reconcile against this. */
  private transportIntent: "playing" | "paused" = "paused";
  /** Seek commit anchor — set on commitSeek(). */
  private seekAnchorTime = 0;
  /** Forward-only playback floor during reconcile. */
  private playbackFloorTime = 0;
  /** Stable duration for current track session. */
  private stableDuration = 0;
  /** Seek lock — ignore provider time corrections briefly after commit. */
  private seekLockUntil = 0;
  /** Wall clock of last provider snapshot reconcile — forward drift while holding time. */
  private lastReconcileAtMs = 0;
  /** Provider play/pause flip guard — rejects rapid oscillation. */
  private lastProviderPlaying: boolean | null = null;
  private lastProviderPlayingFlipMs = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): MediaSessionState => this.state;

  getSnapshot = (): MediaSessionState => this.state;

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private patch(partial: Partial<MediaSessionState>, mirror = false): void {
    this.state = { ...this.state, ...partial };
    if (mirror) this.pushLegacyMirror();
    this.emit();
  }

  attachEngineListener(): void {
    if (this.engineAttached) return;
    this.engineAttached = true;
    globalPlayerEngine.setStateListener((snapshot) => {
      this.onEngineSnapshot(snapshot);
    });
  }

  /** Sole writer of transport + session mirror fields on the Zustand store. */
  private pushLegacyMirror(sessionPatch?: { detailsOpen?: boolean; hydrated?: boolean }): void {
    const patch = {
      currentTrack: this.state.activeTrack,
      queue: this.state.queue,
      queueIndex: this.state.queueIndex,
      isPlaying: this.state.isPlaying,
      isLoading: this.state.isBuffering,
      currentTime: this.state.currentTime,
      duration: this.state.duration,
      error: this.state.error,
      volume: this.state.volume,
      muted: this.state.muted,
      ...sessionPatch,
    };
    logStateSync(patch);
    usePlaybackStore.setState(patch);
    schedulePlaybackPersist();
  }

  private onEngineSnapshot(snapshot: PlayerEngineState): void {
    const sessionTrack = this.state.activeTrack;
    const engineTrack = snapshot.currentTrack;

    const now = Date.now();
    if (this.lastProviderPlaying !== snapshot.isPlaying) {
      if (
        this.lastProviderPlaying !== null &&
        now - this.lastProviderPlayingFlipMs < TRANSPORT_FLIP_GUARD_MS
      ) {
        playbackDebugLog("SESSION", "reconcile: ignore provider play oscillation");
      } else {
        this.lastProviderPlaying = snapshot.isPlaying;
        this.lastProviderPlayingFlipMs = now;
      }
    }

    const trackChanged = engineTrack?.refId !== sessionTrack?.refId;

    const stable = createStableMediaSnapshot({
      snapshot,
      prior: this.state,
      trackChanged,
      hadTrackBefore: this.hadTrackBefore,
      transportIntent: this.transportIntent,
      pendingSeekSeconds: this.pendingSeekSeconds,
      pendingSeekDeadline: this.pendingSeekDeadline,
      seekLockUntil: this.seekLockUntil,
      playbackFloorTime: this.playbackFloorTime,
      stableDuration: this.stableDuration,
      lastReconcileAtMs: this.lastReconcileAtMs,
    });

    this.hadTrackBefore = !!stable.activeTrack;
    this.lastReconcileAtMs = now;

    if (stable.clearPendingSeek) {
      this.pendingSeekSeconds = null;
      this.pendingSeekDeadline = 0;
      this.wasPlayingAtSeek = false;
      if (Date.now() >= this.seekLockUntil) {
        this.seekLockUntil = 0;
      }
    }

    this.playbackFloorTime = stable.playbackFloorTime;
    this.stableDuration = stable.stableDuration;

    this.state = {
      ...this.state,
      activeTrack: stable.activeTrack,
      queueIndex: stable.queueIndex,
      currentTime: stable.currentTime,
      duration: stable.duration,
      isPlaying: stable.isPlaying,
      isBuffering: stable.isBuffering,
      isInitialLoading: stable.isInitialLoading,
      error: stable.error,
      isSeeking: stable.isSeeking,
      seekPreviewTime: stable.seekPreviewTime,
      hoverPreviewTime: stable.hoverPreviewTime,
      // volume + muted: controller-owned — never overwritten by provider reconcile
    };

    this.pushLegacyMirror();
    this.emit();
    if (trackChanged) this.applyVolumeToEngine();
  }

  private applyVolumeToEngine(): void {
    const track = this.state.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    if (kind !== "preview") return;
    globalPlayerEngine.setVolume(this.state.volume);
    globalPlayerEngine.setMuted(this.state.muted);
  }

  private ensureBridge(): void {
    this.attachEngineListener();
    ensurePlaybackEngineReady();
  }

  private recordPlay(type: LibraryItemType, refId: string): void {
    getPlaybackRecordFn()(type, refId);
  }

  play(track: PlaybackItem, options?: PlayOptions): void {
    track = hydratePlaybackItem(track);
    guard("play", track);
    this.ensureBridge();

    if (!globalPlayerEngine.isEngineMounted()) {
      this.pendingPlayItem = track;
      playbackDebugWarn("MOUNT", "play queued — engine root not mounted", track.refId);
      return;
    }

    playbackDebugLog("SESSION", "play()", { refId: track.refId, type: track.type });
    this.recordPlay(track.type, track.refId);

    const session = resolveBrowseSession(track, options);
    const queue = hydratePlaybackQueue(session.queue);
    const queueIndex = session.queueIndex;

    const source = resolvePlaybackSource(track);
    if (source.kind === "none") {
      const issue = source.issue ?? `No playback source for "${track.title}"`;
      playbackDebugWarn("SESSION", "play blocked — no source", {
        refId: track.refId,
        type: track.type,
        issue,
      });
      this.transportIntent = "paused";
      this.state = {
        ...this.state,
        activeTrack: track,
        queue,
        queueIndex,
        error: issue,
        isPlaying: false,
        isBuffering: false,
        isInitialLoading: false,
        hoverPreviewTime: null,
      };
      this.pushLegacyMirror({ detailsOpen: true });
      this.emit();
      return;
    }
    const explicitIndex = options?.browse?.queueIndex ?? options?.queueIndex;
    const queueNavigation =
      explicitIndex !== undefined && explicitIndex !== this.state.queueIndex;

    const engineSnap = globalPlayerEngine.getSnapshot();
    const sameRef =
      !queueNavigation &&
      (isSamePlaybackItem(this.state.activeTrack, track) ||
        isSamePlaybackItem(engineSnap.currentTrack, track));
    const loadInFlight =
      sameRef &&
      ((this.state.isBuffering || this.state.isInitialLoading) ||
        (isSamePlaybackItem(engineSnap.currentTrack, track) && engineSnap.isLoading));

    if (sameRef && this.state.isPlaying && !this.state.error) {
      playbackDebugWarn("SESSION", "play() no-op — already playing", { refId: track.refId });
      this.state = { ...this.state, queue, queueIndex };
      this.pushLegacyMirror({ detailsOpen: true });
      return;
    }

    if (sameRef && loadInFlight && !this.state.error) {
      playbackDebugWarn("SESSION", "play() no-op — load in flight", { refId: track.refId });
      this.state = { ...this.state, queue, queueIndex };
      this.pushLegacyMirror({ detailsOpen: true });
      return;
    }

    if (sameRef && !this.state.isPlaying && !this.state.error) {
      playbackDebugLog("SESSION", "play() resume same item", track.refId);
      this.transportIntent = "playing";
      this.state = { ...this.state, queue, queueIndex, isPlaying: true };
      this.pushLegacyMirror({ detailsOpen: true });
      this.emit();
      globalPlayerEngine.resume();
      return;
    }

    playbackDebugLog("QUEUE", "play() session", { refId: track.refId, queueIndex, queueLength: queue.length });

    const trackChanged = !isSamePlaybackItem(this.state.activeTrack, track);
    this.transportIntent = "playing";
    if (trackChanged) {
      this.seekAnchorTime = 0;
      this.playbackFloorTime = 0;
      this.stableDuration = 0;
      this.seekLockUntil = 0;
      this.lastReconcileAtMs = 0;
      this.lastProviderPlaying = null;
      this.lastProviderPlayingFlipMs = 0;
    }
    this.state = {
      ...this.state,
      activeTrack: track,
      queue,
      queueIndex,
      error: null,
      hoverPreviewTime: null,
      isBuffering: true,
      isPlaying: true,
      isInitialLoading: trackChanged,
      currentTime: trackChanged ? 0 : this.state.currentTime,
      duration: trackChanged ? 0 : this.state.duration,
    };
    this.pushLegacyMirror({ detailsOpen: true });
    this.emit();
    this.applyVolumeToEngine();
    globalPlayerEngine.play(track);
  }

  pause(): void {
    guard("pause", this.state.activeTrack);
    playbackDebugLog("SESSION", "pause()");
    this.transportIntent = "paused";
    this.patch({ isPlaying: false }, true);
    globalPlayerEngine.pause();
  }

  resume(): void {
    guard("resume", this.state.activeTrack);
    playbackDebugLog("SESSION", "resume()");
    this.transportIntent = "playing";
    this.patch({ isPlaying: true }, true);
    globalPlayerEngine.resume();
  }

  togglePlayPause(): void {
    guard("toggle", this.state.activeTrack);
    if (!this.state.activeTrack) return;
    if (this.transportIntent === "playing") this.pause();
    else this.resume();
  }

  toggle(): void {
    this.togglePlayPause();
  }

  stop(): void {
    guard("stop", this.state.activeTrack);
    playbackDebugLog("SESSION", "stop()");
    globalPlayerEngine.stop();
    this.transportIntent = "paused";
    this.state = { ...EMPTY, volume: this.state.volume, muted: this.state.muted };
    this.pendingSeekSeconds = null;
    this.pendingSeekDeadline = 0;
    this.wasPlayingAtSeek = false;
    this.seekAnchorTime = 0;
    this.playbackFloorTime = 0;
    this.stableDuration = 0;
    this.seekLockUntil = 0;
    this.lastReconcileAtMs = 0;
    this.lastProviderPlaying = null;
    this.lastProviderPlayingFlipMs = 0;
    this.pushLegacyMirror({ detailsOpen: false });
    clearPersistedPlayback();
    this.emit();
  }

  beginSeek(seconds: number): void {
    const target =
      this.state.duration > 0
        ? clampPlaybackPosition(seconds, this.state.duration)
        : Math.max(0, seconds);
    this.patch({ isSeeking: true, seekPreviewTime: target, hoverPreviewTime: null });
  }

  updateSeek(seconds: number): void {
    if (!this.state.isSeeking) return;
    const target =
      this.state.duration > 0
        ? clampPlaybackPosition(seconds, this.state.duration)
        : Math.max(0, seconds);
    this.patch({ seekPreviewTime: target });
  }

  setHoverPreview(seconds: number): void {
    if (this.state.isSeeking || this.state.duration <= 0) return;
    const target = clampPlaybackPosition(seconds, this.state.duration);
    if (this.state.hoverPreviewTime === target) return;
    this.patch({ hoverPreviewTime: target });
  }

  clearHoverPreview(): void {
    if (this.state.hoverPreviewTime === null) return;
    this.patch({ hoverPreviewTime: null });
  }

  commitSeek(seconds: number): void {
    guard("seek", this.state.activeTrack);
    const target =
      this.state.duration > 0
        ? clampPlaybackPosition(seconds, this.state.duration)
        : Math.max(0, seconds);
    if (
      this.pendingSeekSeconds === null &&
      !this.state.isSeeking &&
      Math.abs(this.state.currentTime - target) < 0.05
    ) {
      return;
    }
    this.pendingSeekSeconds = target;
    this.pendingSeekDeadline = Date.now() + 3000;
    this.wasPlayingAtSeek = this.transportIntent === "playing";
    this.seekLockUntil = Date.now() + SEEK_LOCK_MS;
    this.seekAnchorTime = target;
    this.playbackFloorTime = target;
    playbackDebugLog("SESSION", "commitSeek()", { seconds: target });
    this.patch({
      isSeeking: false,
      seekPreviewTime: null,
      hoverPreviewTime: null,
      currentTime: target,
    });
    this.pushLegacyMirror();
    globalPlayerEngine.seek(target);
  }

  seek(seconds: number): void {
    this.commitSeek(seconds);
  }

  skipForward(seconds = 10): void {
    const max =
      this.state.duration > 0 ? this.state.duration : this.state.currentTime + seconds;
    this.commitSeek(Math.min(this.state.currentTime + seconds, max));
  }

  skipBackward(seconds = 10): void {
    this.commitSeek(Math.max(0, this.state.currentTime - seconds));
  }

  next(): void {
    guard("next", this.state.activeTrack);
    if (!this.state.activeTrack) return;
    const nextIndex = this.state.queueIndex + 1;
    if (nextIndex >= this.state.queue.length) return;
    const nextItem = this.state.queue[nextIndex];
    if (!nextItem) return;
    this.play(nextItem, { browse: { queue: this.state.queue, queueIndex: nextIndex } });
  }

  prev(): void {
    guard("prev", this.state.activeTrack);
    if (!this.state.activeTrack) return;
    if (this.state.currentTime > 3) {
      this.commitSeek(0);
      return;
    }
    const prevIndex = this.state.queueIndex - 1;
    if (prevIndex < 0) return;
    const prevItem = this.state.queue[prevIndex];
    if (!prevItem) return;
    this.play(prevItem, { browse: { queue: this.state.queue, queueIndex: prevIndex } });
  }

  setVolume(volume: number): void {
    guard("setVolume", this.state.activeTrack);
    const track = this.state.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    const clamped = Math.max(0, Math.min(1, volume));
    const muted = clamped === 0;
    if (clamped > 0) this.lastAudibleVolume = clamped;
    if (kind === "preview") {
      globalPlayerEngine.setVolume(clamped);
      globalPlayerEngine.setMuted(muted);
    }
    this.patch({ volume: clamped, muted }, true);
  }

  toggleMute(): void {
    guard("toggleMute", this.state.activeTrack);
    const track = this.state.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    if (kind !== "preview") return;
    if (this.state.muted) {
      const restore =
        this.state.volume > 0 ? this.state.volume : this.lastAudibleVolume;
      this.setVolume(restore);
      return;
    }
    if (this.state.volume > 0) this.lastAudibleVolume = this.state.volume;
    globalPlayerEngine.setMuted(true);
    this.patch({ muted: true, volume: this.state.volume }, true);
  }

  retry(): void {
    const item = this.state.activeTrack;
    if (!item) return;
    this.play(item, { browse: { queue: this.state.queue, queueIndex: this.state.queueIndex } });
  }

  isActive(type: PlaybackItem["type"], refId: string): boolean {
    const track = this.state.activeTrack;
    return !!track && track.type === type && track.refId === refId;
  }

  /** Preview track ended — advance queue. */
  advanceQueueOnEnd(): void {
    const nextIndex = this.state.queueIndex + 1;
    if (nextIndex >= this.state.queue.length) {
      this.transportIntent = "paused";
      this.patch({ isPlaying: false, isBuffering: false, isInitialLoading: false }, true);
      return;
    }
    const nextItem = this.state.queue[nextIndex];
    if (!nextItem) return;
    playbackDebugLog("QUEUE", "preview ended — advancing", { to: nextItem.refId, nextIndex });
    this.play(nextItem, { browse: { queue: this.state.queue, queueIndex: nextIndex } });
  }

  /** Resume a play request queued before engine mount. */
  flushPendingPlay(): void {
    if (!this.pendingPlayItem) return;
    const item = this.pendingPlayItem;
    this.pendingPlayItem = null;
    this.play(item);
  }

  /** Bootstrap paused session from persistence without starting transport. */
  hydratePausedSession(
    track: PlaybackItem,
    position: number,
    queue: PlaybackItem[],
    queueIndex: number,
  ): void {
    track = hydratePlaybackItem(track);
    queue = hydratePlaybackQueue(queue);
    this.transportIntent = "paused";
    this.state = {
      ...this.state,
      activeTrack: track,
      queue,
      queueIndex,
      currentTime: position,
      isPlaying: false,
      isBuffering: false,
      error: null,
    };
    this.seekAnchorTime = position;
    this.playbackFloorTime = position;
    this.pushLegacyMirror({ hydrated: true });
    this.emit();
  }

  /** Bootstrap queue metadata from persistence. */
  hydrateQueue(queue: PlaybackItem[], queueIndex: number): void {
    this.state = { ...this.state, queue, queueIndex };
    this.pushLegacyMirror({ hydrated: true });
    this.emit();
  }

  __resetForTests(): void {
    this.state = { ...EMPTY };
    this.pendingSeekSeconds = null;
    this.pendingSeekDeadline = 0;
    this.wasPlayingAtSeek = false;
    this.hadTrackBefore = false;
    this.lastAudibleVolume = 0.8;
    this.pendingPlayItem = null;
    this.transportIntent = "paused";
    this.seekAnchorTime = 0;
    this.playbackFloorTime = 0;
    this.stableDuration = 0;
    this.seekLockUntil = 0;
    this.lastReconcileAtMs = 0;
    this.lastProviderPlaying = null;
    this.lastProviderPlayingFlipMs = 0;
    this.engineAttached = false;
    this.listeners.clear();
  }
}

export const mediaSessionController = new MediaSessionController();
