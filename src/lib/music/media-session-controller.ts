/**
 * MediaSessionController — single source of truth for all playback state.
 *
 * Flow: UI → MediaSessionController → GlobalPlayerEngine → ProviderRouter → providers
 * Return: provider → engine snapshot → controller → subscribers + persistence mirror
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
  getPlaybackRecordFn,
  ensurePlaybackEngineReady,
} from "@/stores/playback-store";
import { shouldAcceptPositionAfterSeek } from "@/lib/music/audio-transport-sync";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { playbackDebugLog, playbackDebugWarn } from "@/lib/music/playback-debug";
import { syncAuditRecord } from "@/lib/music/playback-sync-audit";
import { volumePipelineTrace } from "@/lib/music/volume-pipeline-trace";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";
import { mscReconcileTrace } from "@/lib/music/msc-reconcile-trace";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";
import { playPausePipelineTrace, isDuplicateCommand } from "@/lib/music/play-pause-pipeline-trace";
import {
  hydrationPipelineTrace,
  hydrationTraceMarkStart,
  hydrationTraceMarkFinish,
} from "@/lib/music/hydration-pipeline-trace";
import { warnIfAudioTransportInVideoContext } from "@/lib/music/playback-domain-lock";
import {
  MediaSessionPersistence,
  type MirrorSessionPatch,
} from "@/lib/music/media-session-persistence";
import {
  clampSeekTarget,
  holdsTransportTimeDuringScrub,
  MediaSessionUiSession,
  mediaSessionDisplayTime as resolveMediaSessionDisplayTime,
  reconcileUiFromEngine,
  type MediaSessionUiState,
} from "@/lib/music/media-session-ui";
import {
  isExplicitQueueNavigation,
  MediaSessionQueueSession,
  reconcileQueueIndex,
  resolveAdvanceOnEnd,
  resolveBrowseSession,
  resolveNextQueueTarget,
  resolvePreviousQueueTarget,
  type MediaSessionQueueState,
} from "@/lib/music/media-session-queue";

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

type SessionTransportState = Omit<
  MediaSessionState,
  "isSeeking" | "seekPreviewTime" | "hoverPreviewTime" | "queue" | "queueIndex"
>;

type PlayOptions = {
  queue?: PlaybackItem[];
  queueIndex?: number;
  browse?: PlaybackBrowseContext;
  /** Persisted resume position — used once on hydration refresh while playing. */
  resumePosition?: number;
};

type Listener = () => void;

const EMPTY_TRANSPORT: SessionTransportState = {
  activeTrack: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isBuffering: false,
  isInitialLoading: false,
  volume: 1,
  muted: false,
  error: null,
};

const SEEK_LOCK_MS = 300;

// ── Session helpers ───────────────────────────────────────────────────────────

function guard(action: string, track: PlaybackItem | null): void {
  warnIfAudioTransportInVideoContext(action, track);
}

/** Display position for progress UI — drag preview, then hover preview, then transport time. */
export function mediaSessionDisplayTime(
  currentTime: number,
  state: {
    isSeeking: boolean;
    seekPreviewTime: number | null;
    hoverPreviewTime: number | null;
  }
): number {
  if (state.isSeeking && state.seekPreviewTime !== null) {
    return state.seekPreviewTime;
  }

  if (state.hoverPreviewTime !== null) {
    return state.hoverPreviewTime;
  }

  return currentTime;
}
// ── Reconciliation ────────────────────────────────────────────────────────────

type ReconcileInput = {
  snapshot: PlayerEngineState;
  prior: SessionTransportState;
  priorQueue: MediaSessionQueueState;
  priorUi: MediaSessionUiState;
  trackChanged: boolean;
  hadTrackBefore: boolean;
  transportIntent: "playing" | "paused";
  pendingSeekSeconds: number | null;
  pendingSeekDeadline: number;
  seekLockUntil: number;
  pendingSeekOriginSeconds: number | null;
};

type ReconcileTransportResult = {
  activeTrack: PlaybackItem | null;
  queueIndex: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isInitialLoading: boolean;
  error: string | null;
  clearPendingSeek: boolean;
};

type ReconcileResult = {
  transport: ReconcileTransportResult;
  ui: MediaSessionUiState;
};

/** Reconcile engine/provider reports into session state. Volume/mute stay controller-owned. */
function reconcileEngineSnapshot(input: ReconcileInput): ReconcileResult {
  const {
    snapshot,
    prior,
    priorQueue,
    priorUi,
    trackChanged,
    hadTrackBefore,
    transportIntent,
    pendingSeekSeconds,
    pendingSeekDeadline,
    seekLockUntil,
    pendingSeekOriginSeconds,
  } = input;

  const transportBefore = prior.currentTime;
  const engineCurrentTime = snapshot.currentTime;

  mscReconcileTrace("reconcileEngineSnapshot", "ENTER", {
    engineCurrentTime,
    engineIsLoading: snapshot.isLoading,
    engineCurrentTrack: snapshot.currentTrack?.refId ?? null,
    pendingSeekSeconds,
    pendingSeekDeadline,
    seekLockUntil,
    transportCurrentTimeBefore: transportBefore,
    trackChanged,
    priorUiIsSeeking: priorUi.isSeeking,
    priorUiSeekPreview: priorUi.seekPreviewTime,
  });

  const isSeeking = pendingSeekSeconds !== null || priorUi.isSeeking;
  const providerTime = snapshot.currentTime;
  const providerDuration = snapshot.duration;
  const isBuffering = snapshot.isLoading;
  const now = Date.now();
  const inSeekLock = now < seekLockUntil;
  const inSeekSettle = pendingSeekSeconds !== null;

  mscReconcileTrace("reconcileEngineSnapshot", "BRANCH", {
    condition: "seek flags",
    isSeeking,
    inSeekLock,
    inSeekSettle,
    now,
  });

  const positionDecision = shouldAcceptPositionAfterSeek(
    providerTime,
    pendingSeekSeconds,
    pendingSeekDeadline,
    0.25,
    pendingSeekOriginSeconds,
  );
  const clearPendingSeek =
    positionDecision.clearPending && !inSeekLock;

  mscReconcileTrace("reconcileEngineSnapshot", "GUARD", {
    condition: "shouldAcceptPositionAfterSeek",
    providerTime,
    pendingSeekSeconds,
    pendingSeekDeadline,
    accept: positionDecision.accept,
    clearPending: positionDecision.clearPending,
    clearPendingSeek,
    inSeekLock,
    deadlineExpired: pendingSeekSeconds !== null && now > pendingSeekDeadline,
  });

  const queueIndex = reconcileQueueIndex(
    priorQueue.queue,
    priorQueue.queueIndex,
    snapshot.currentTrack,
    trackChanged,
  );

  let currentTime: number;
  let currentTimeBranch: string;

  if (trackChanged) {
    currentTime = Math.max(0, providerTime);
    currentTimeBranch = "trackChanged → providerTime";
  } else if (pendingSeekSeconds !== null) {
    if (positionDecision.accept) {
      currentTime = providerTime;
      currentTimeBranch = "pendingSeek + accept → providerTime";
    } else {
      currentTime = pendingSeekSeconds;
      currentTimeBranch = "pendingSeek + pending → pendingSeekSeconds";
    }
  } else if (
    inSeekLock &&
    Math.abs(providerTime - transportBefore) > 0.25
  ) {
    currentTime = transportBefore;
    currentTimeBranch = "inSeekLock → preserve prior transport (reject stale provider tick)";
  } else {
    currentTime = providerTime;
    currentTimeBranch = "default → providerTime";
  }

  mscReconcileTrace("reconcileEngineSnapshot", "BRANCH", {
    condition: "currentTime assignment",
    branch: currentTimeBranch,
    assignedCurrentTime: currentTime,
    providerTime,
    pendingSeekSeconds,
    preservedPriorTransport: currentTime === transportBefore && providerTime !== transportBefore,
  });

  let duration = prior.duration;
  if (trackChanged) {
    duration = providerDuration > 0 ? providerDuration : 0;
  } else if (providerDuration > 0) {
    duration = providerDuration;
  }

  const isPlaying = transportIntent === "playing" && !snapshot.error;

  const initialLoad =
    trackChanged ||
    (!hadTrackBefore && !!snapshot.currentTrack) ||
    (isBuffering && prior.currentTime === 0 && providerTime === 0);

  const ui = reconcileUiFromEngine(
    priorUi,
    positionDecision.accept,
    pendingSeekSeconds,
  );

  if (priorUi.isSeeking && positionDecision.accept && pendingSeekSeconds === null) {
    const beforeOverride = currentTime;
    currentTime = providerTime;
    mscReconcileTrace("reconcileEngineSnapshot", "BRANCH", {
      condition: "post-scrub settle override",
      priorUiIsSeeking: priorUi.isSeeking,
      positionAccept: positionDecision.accept,
      pendingSeekSeconds,
      currentTimeBeforeOverride: beforeOverride,
      currentTimeAfterOverride: currentTime,
      action: "accept providerTime after scrub ended",
    });
  }

  const transportAfter = currentTime;
  const acceptedEngineTime = Math.abs(currentTime - providerTime) <= 0.05;
  const preservedInsteadOfEngine = !acceptedEngineTime && providerTime !== transportBefore;

  if (preservedInsteadOfEngine) {
    mscReconcileTrace("reconcileEngineSnapshot", "GUARD", {
      condition: "PRESERVED non-engine time instead of accepting engine.currentTime",
      engineCurrentTime: providerTime,
      transportBefore,
      transportAfter,
      pendingSeekSeconds,
      currentTimeBranch,
      deltaEngineVsTransport: providerTime - transportAfter,
    });
  }

  mscReconcileTrace("reconcileEngineSnapshot", "EXIT", {
    transportCurrentTimeBefore: transportBefore,
    transportCurrentTimeAfter: transportAfter,
    engineCurrentTime: providerTime,
    acceptedEngineTime,
    clearPendingSeek,
    currentTimeBranch,
  });

  return {
    transport: {
      activeTrack: snapshot.currentTrack,
      queueIndex,
      currentTime,
      duration,
      isPlaying,
      isBuffering,
      isInitialLoading: initialLoad && isBuffering,
      error: snapshot.error,
      clearPendingSeek,
    },
    ui,
  };
}

class MediaSessionController {
  // ── Published session state ─────────────────────────────────────────────────

  private transport: SessionTransportState = { ...EMPTY_TRANSPORT };
  private queueSession = new MediaSessionQueueSession();
  private uiSession = new MediaSessionUiSession();
  private persistence = new MediaSessionPersistence();
  private listeners = new Set<Listener>();

  // ── Execution bridge ────────────────────────────────────────────────────────

  private engineAttached = false;
  private pendingPlayItem: PlaybackItem | null = null;

  // ── Session authority (not provider-derived) ────────────────────────────────

  /** User transport intent — reconciled isPlaying follows this, not provider isPlaying. */
  private transportIntent: "playing" | "paused" = "paused";
  private hadTrackBefore = false;
  private lastAudibleVolume = 0.8;

  // ── Seek settle caches ──────────────────────────────────────────────────────

  private pendingSeekSeconds: number | null = null;
  private pendingSeekOriginSeconds: number | null = null;
  private pendingSeekDeadline = 0;
  private seekLockUntil = 0;

  /** Set when play() targets preview audio; cleared once session volume reaches the new AudioProvider. */
  private pendingAudioVolumeApply = false;

  private lastPlayTraceRef: string | null = null;
  private lastPlayTraceAt = 0;

  // ── Read API ────────────────────────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): MediaSessionState => ({
    ...this.transport,
    ...this.queueSession.getState(),
    ...this.uiSession.getState(),
  });

  getSnapshot = (): MediaSessionState => this.getState();

  isActive(type: PlaybackItem["type"], refId: string): boolean {
    const track = this.transport.activeTrack;
    return !!track && track.type === type && track.refId === refId;
  }

  // ── Internal session plumbing ─────────────────────────────────────────────────

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private patchTransport(partial: Partial<SessionTransportState>, mirror = false): void {
    const priorPlaying = this.transport.isPlaying;
    this.transport = { ...this.transport, ...partial };
    if ("isPlaying" in partial && partial.isPlaying !== priorPlaying) {
      playPausePipelineTrace({
        fn: "MediaSessionController.patchTransport",
        phase: "transport_patch",
        event: partial.isPlaying ? "play" : "pause",
        mscIsPlaying: this.transport.isPlaying,
        transportIntent: this.transportIntent,
        transportPatched: true,
        activeTrack: this.transport.activeTrack?.refId ?? null,
        extra: { priorPlaying, mirror, partialKeys: Object.keys(partial) },
      });
    }
    if (mirror) this.pushLegacyMirror();
    this.emit();
  }

  private clearSeekState(): void {
    this.pendingSeekSeconds = null;
    this.pendingSeekOriginSeconds = null;
    this.pendingSeekDeadline = 0;
    this.seekLockUntil = 0;
  }

  private applyReconciledTransport(reconciled: ReconcileTransportResult): void {
    const priorIndex = this.queueSession.getState().queueIndex;
    this.queueSession.applyQueueIndex(reconciled.queueIndex);
    queuePipelineTrace({
      fn: "MediaSessionController.applyReconciledTransport",
      phase: "queue_index",
      queueReconciledIndex: reconciled.queueIndex,
      currentQueueIndex: priorIndex,
      mscActiveTrack: this.transport.activeTrack?.refId ?? null,
      targetActiveTrack: reconciled.activeTrack?.refId ?? null,
      trackChanged: reconciled.activeTrack?.refId !== this.transport.activeTrack?.refId,
      transportPatched: true,
    });
    this.transport = {
      ...this.transport,
      activeTrack: reconciled.activeTrack,
      currentTime: reconciled.currentTime,
      duration: reconciled.duration,
      isPlaying: reconciled.isPlaying,
      isBuffering: reconciled.isBuffering,
      isInitialLoading: reconciled.isInitialLoading,
      error: reconciled.error,
    };
    playPausePipelineTrace({
      fn: "MediaSessionController.applyReconciledTransport",
      phase: "reconcile",
      event: reconciled.isPlaying ? "play" : "pause",
      mscIsPlaying: reconciled.isPlaying,
      engineIsPlaying: globalPlayerEngine.getSnapshot().isPlaying,
      transportIntent: this.transportIntent,
      activeTrack: reconciled.activeTrack?.refId ?? null,
      note: "reconcileEngineSnapshot applied isPlaying from transportIntent",
    });
  }

  /** Delegates legacy mirror + persist scheduling to persistence layer. */
  private pushLegacyMirror(sessionPatch?: MirrorSessionPatch): void {
    const session = this.getState();
    this.persistence.pushLegacyMirror(
      {
        currentTrack: session.activeTrack,
        queue: session.queue,
        queueIndex: session.queueIndex,
        isPlaying: session.isPlaying,
        isLoading: session.isBuffering,
        currentTime: session.currentTime,
        duration: session.duration,
        error: session.error,
        volume: session.volume,
        muted: session.muted,
      },
      sessionPatch,
    );
  }

  // ── Engine bridge ─────────────────────────────────────────────────────────────

  attachEngineListener(): void {
    if (this.engineAttached) {
      hydrationPipelineTrace({
        fn: "MediaSessionController.initialize",
        phase: "attachEngineListener_skipped",
        note: "already attached",
      });
      return;
    }
    this.engineAttached = true;
    hydrationPipelineTrace({
      fn: "MediaSessionController.initialize",
      phase: "attachEngineListener",
    });
    globalPlayerEngine.setStateListener((snapshot) => {
      this.onEngineSnapshot(snapshot);
    });
  }

  private ensureBridge(): void {
    this.attachEngineListener();
    ensurePlaybackEngineReady();
  }

  private applyVolumeToEngine(): boolean {
    const track = this.transport.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.applyVolumeToEngine",
      phase: "enter",
      previousVolume: this.transport.volume,
      previousMuted: this.transport.muted,
      providerKind: kind,
      activeRouterKind: kind === "preview" ? "audio" : kind,
      note: kind !== "preview" ? "early_return_non_preview" : "forwarding_to_engine",
    });
    if (kind !== "preview") return false;
    globalPlayerEngine.setVolume(this.transport.volume);
    globalPlayerEngine.setMuted(this.transport.muted);
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.applyVolumeToEngine",
      phase: "exit",
      newVolume: this.transport.volume,
      newMuted: this.transport.muted,
      providerAccepted: true,
    });
    if (typeof document === "undefined") return false;
    const audio = document.querySelector("#vitalforge-playback-root audio") as HTMLAudioElement | null;
    if (!audio) return false;
    return (
      Math.abs(audio.volume - this.transport.volume) <= 0.001 &&
      audio.muted === this.transport.muted
    );
  }

  private onEngineSnapshot(snapshot: PlayerEngineState): void {
    const sessionTrack = this.transport.activeTrack;
    const engineTrack = snapshot.currentTrack;
    const trackChanged = engineTrack?.refId !== sessionTrack?.refId;
    const transportBefore = this.transport.currentTime;

    queuePipelineTrace({
      fn: "MediaSessionController.onEngineSnapshot",
      phase: "enter",
      trackChanged,
      mscActiveTrack: sessionTrack?.refId ?? null,
      engineActiveTrack: engineTrack?.refId ?? null,
      mscQueueIndex: this.queueSession.getState().queueIndex,
      queueLength: this.queueSession.getState().queue.length,
    });

    mscReconcileTrace("onEngineSnapshot", "ENTER", {
      engineCurrentTime: snapshot.currentTime,
      engineIsLoading: snapshot.isLoading,
      engineCurrentTrack: snapshot.currentTrack?.refId ?? null,
      pendingSeekSeconds: this.pendingSeekSeconds,
      pendingSeekDeadline: this.pendingSeekDeadline,
      seekLockUntil: this.seekLockUntil,
      transportCurrentTimeBefore: transportBefore,
      trackChanged,
      uiIsSeeking: this.uiSession.getState().isSeeking,
      uiSeekPreview: this.uiSession.getState().seekPreviewTime,
    });

    const reconciled = reconcileEngineSnapshot({
      snapshot,
      prior: this.transport,
      priorQueue: this.queueSession.getState(),
      priorUi: this.uiSession.getState(),
      trackChanged,
      hadTrackBefore: this.hadTrackBefore,
      transportIntent: this.transportIntent,
      pendingSeekSeconds: this.pendingSeekSeconds,
      pendingSeekDeadline: this.pendingSeekDeadline,
      seekLockUntil: this.seekLockUntil,
      pendingSeekOriginSeconds: this.pendingSeekOriginSeconds,
    });

    this.hadTrackBefore = !!reconciled.transport.activeTrack;

    if (reconciled.transport.clearPendingSeek) {
      mscReconcileTrace("onEngineSnapshot", "BRANCH", {
        condition: "clearPendingSeek",
        clearedPendingSeekSeconds: this.pendingSeekSeconds,
        positionAccept: true,
      });
      this.pendingSeekSeconds = null;
      this.pendingSeekDeadline = 0;
      if (Date.now() >= this.seekLockUntil) {
        this.seekLockUntil = 0;
      }
    }

    this.uiSession.applyReconciled(reconciled.ui);

    const applyBefore = this.transport.currentTime;
    if (reconciled.transport.currentTime !== applyBefore) {
      mscReconcileTrace("onEngineSnapshot", "PATCH", {
        transportCurrentTimeBefore: applyBefore,
        transportCurrentTimeAfter: reconciled.transport.currentTime,
        engineCurrentTime: snapshot.currentTime,
        pendingSeekSeconds: this.pendingSeekSeconds,
        source: "applyReconciledTransport",
      });
    } else if (Math.abs(snapshot.currentTime - applyBefore) > 0.05) {
      mscReconcileTrace("onEngineSnapshot", "SKIP_PATCH", {
        reason: "reconciled.currentTime unchanged but engine.currentTime differs",
        transportCurrentTime: applyBefore,
        reconciledCurrentTime: reconciled.transport.currentTime,
        engineCurrentTime: snapshot.currentTime,
        pendingSeekSeconds: this.pendingSeekSeconds,
        currentTimeBranch: "see reconcileEngineSnapshot EXIT",
      });
    } else {
      mscReconcileTrace("onEngineSnapshot", "SKIP_PATCH", {
        reason: "reconciled.currentTime unchanged, engine aligned",
        transportCurrentTime: applyBefore,
        engineCurrentTime: snapshot.currentTime,
      });
    }

    this.applyReconciledTransport(reconciled.transport);

    const transportAfter = this.transport.currentTime;
    const engineAdvanced = Math.abs(snapshot.currentTime - transportAfter) > 0.05;

    if (engineAdvanced) {
      mscReconcileTrace("onEngineSnapshot", "GUARD", {
        condition: "POST-RECONCILE MISMATCH — engine.currentTime still differs from transport.currentTime",
        engineCurrentTime: snapshot.currentTime,
        transportCurrentTimeBefore: transportBefore,
        transportCurrentTimeAfter: transportAfter,
        pendingSeekSeconds: this.pendingSeekSeconds,
        reconciledCurrentTime: reconciled.transport.currentTime,
      });
    }

    mscReconcileTrace("onEngineSnapshot", "EXIT", {
      engineCurrentTime: snapshot.currentTime,
      transportCurrentTimeBefore: transportBefore,
      transportCurrentTimeAfter: transportAfter,
      pendingSeekSeconds: this.pendingSeekSeconds,
      clearPendingSeek: reconciled.transport.clearPendingSeek,
    });

    syncAuditRecord({
      ts: Date.now(),
      action: "msc-reconcile",
      layer: "msc",
      currentTime: this.transport.currentTime,
      duration: this.transport.duration,
      isPlaying: this.transport.isPlaying,
      volume: this.transport.volume,
      muted: this.transport.muted,
      isLoading: this.transport.isBuffering || this.transport.isInitialLoading,
      currentTrack: this.transport.activeTrack?.refId ?? null,
      extra: {
        pendingSeekSeconds: this.pendingSeekSeconds,
        uiIsSeeking: this.uiSession.getState().isSeeking,
        providerCurrentTime: snapshot.currentTime,
      },
    });
    this.pushLegacyMirror();
    this.emit();
    if (this.pendingAudioVolumeApply) {
      if (this.applyVolumeToEngine()) {
        this.pendingAudioVolumeApply = false;
      }
    } else if (trackChanged) {
      this.applyVolumeToEngine();
    }
  }

  private recordPlay(type: LibraryItemType, refId: string): void {
    getPlaybackRecordFn()(type, refId);
  }

  // ── Playback execution commands ─────────────────────────────────────────────

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
    const now = Date.now();
    const duplicatePlay =
      this.lastPlayTraceRef === track.refId && now - this.lastPlayTraceAt < 500;
    this.lastPlayTraceRef = track.refId;
    this.lastPlayTraceAt = now;
    queuePipelineTrace({
      fn: "MediaSessionController.play",
      phase: "enter",
      targetActiveTrack: track.refId,
      currentActiveTrack: this.transport.activeTrack?.refId ?? null,
      currentQueueIndex: this.queueSession.getState().queueIndex,
      targetQueueIndex: options?.browse?.queueIndex ?? options?.queueIndex ?? null,
      queueLength: options?.browse?.queue?.length ?? options?.queue?.length ?? null,
      duplicatePlay,
      pendingPlay: false,
    });
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
      this.uiSession.clearHoverPreview();
      this.queueSession.setQueue(queue, queueIndex);
      this.transport = {
        ...this.transport,
        activeTrack: track,
        error: issue,
        isPlaying: false,
        isBuffering: false,
        isInitialLoading: false,
      };
      this.pushLegacyMirror({ detailsOpen: true });
      this.emit();
      return;
    }
    const explicitIndex = options?.browse?.queueIndex ?? options?.queueIndex;
    const queueNavigation = isExplicitQueueNavigation(
      explicitIndex,
      this.queueSession.getState().queueIndex,
    );

    const engineSnap = globalPlayerEngine.getSnapshot();
    const sameRef =
      !queueNavigation &&
      (isSamePlaybackItem(this.transport.activeTrack, track) ||
        isSamePlaybackItem(engineSnap.currentTrack, track));
    const loadInFlight =
      sameRef &&
      ((this.transport.isBuffering || this.transport.isInitialLoading) ||
        (isSamePlaybackItem(engineSnap.currentTrack, track) && engineSnap.isLoading));

    if (sameRef && this.transport.isPlaying && !this.transport.error) {
      playbackDebugWarn("SESSION", "play() no-op — already playing", { refId: track.refId });
      this.queueSession.setQueue(queue, queueIndex);
      this.pushLegacyMirror({ detailsOpen: true });
      return;
    }

    if (sameRef && loadInFlight && !this.transport.error) {
      playbackDebugWarn("SESSION", "play() no-op — load in flight", { refId: track.refId });
      this.queueSession.setQueue(queue, queueIndex);
      this.pushLegacyMirror({ detailsOpen: true });
      return;
    }

    if (sameRef && !this.transport.isPlaying && !this.transport.error) {
      playbackDebugLog("SESSION", "play() resume same item", track.refId);
      this.transportIntent = "playing";
      this.queueSession.setQueue(queue, queueIndex);
      this.transport = { ...this.transport, isPlaying: true };
      this.pushLegacyMirror({ detailsOpen: true });
      this.emit();
      globalPlayerEngine.resume();
      return;
    }

    playbackDebugLog("QUEUE", "play() session", { refId: track.refId, queueIndex, queueLength: queue.length });

    const trackChanged = !isSamePlaybackItem(this.transport.activeTrack, track);
    this.transportIntent = "playing";
    if (trackChanged) {
      this.clearSeekState();
    }
    this.uiSession.clearHoverPreview();
    this.queueSession.setQueue(queue, queueIndex);
    queuePipelineTrace({
      fn: "MediaSessionQueueSession.setQueue",
      phase: "via_play",
      currentQueueIndex: queueIndex,
      targetQueueIndex: queueIndex,
      queueLength: queue.length,
      targetActiveTrack: track.refId,
    });
    this.transport = {
      ...this.transport,
      activeTrack: track,
      error: null,
      isBuffering: true,
      isPlaying: true,
      isInitialLoading: trackChanged,
      currentTime: trackChanged ? 0 : this.transport.currentTime,
      duration: trackChanged ? 0 : this.transport.duration,
    };
    this.pushLegacyMirror({ detailsOpen: true });
    this.emit();
    if (source.kind === "preview") {
      this.pendingAudioVolumeApply = true;
    }
    this.applyVolumeToEngine();
    globalPlayerEngine.play(track);
    const resumeAt = options?.resumePosition;
    if (typeof resumeAt === "number" && resumeAt > 0) {
      this.commitSeek(resumeAt);
    }
  }

  pause(): void {
    guard("pause", this.transport.activeTrack);
    playbackDebugLog("SESSION", "pause()");
    const engine = globalPlayerEngine.getSnapshot();
    playPausePipelineTrace({
      fn: "MediaSessionController.pause",
      phase: "ENTER",
      event: "pause",
      duplicateCommand: isDuplicateCommand("msc-pause"),
      mscIsPlaying: this.transport.isPlaying,
      engineIsPlaying: engine.isPlaying,
      transportIntent: this.transportIntent,
      activeTrack: this.transport.activeTrack?.refId ?? null,
    });
    this.transportIntent = "paused";
    this.patchTransport({ isPlaying: false }, true);
    globalPlayerEngine.pause();
    playPausePipelineTrace({
      fn: "MediaSessionController.pause",
      phase: "EXIT",
      event: "pause",
      mscIsPlaying: this.transport.isPlaying,
      engineIsPlaying: globalPlayerEngine.getSnapshot().isPlaying,
      transportIntent: this.transportIntent,
      activeTrack: this.transport.activeTrack?.refId ?? null,
    });
  }

  resume(): void {
    guard("resume", this.transport.activeTrack);
    playbackDebugLog("SESSION", "resume()");
    const engine = globalPlayerEngine.getSnapshot();
    playPausePipelineTrace({
      fn: "MediaSessionController.resume",
      phase: "ENTER",
      event: "resume",
      duplicateCommand: isDuplicateCommand("msc-resume"),
      mscIsPlaying: this.transport.isPlaying,
      engineIsPlaying: engine.isPlaying,
      transportIntent: this.transportIntent,
      activeTrack: this.transport.activeTrack?.refId ?? null,
    });
    this.transportIntent = "playing";
    this.patchTransport({ isPlaying: true }, true);
    globalPlayerEngine.resume();
    playPausePipelineTrace({
      fn: "MediaSessionController.resume",
      phase: "EXIT",
      event: "resume",
      mscIsPlaying: this.transport.isPlaying,
      engineIsPlaying: globalPlayerEngine.getSnapshot().isPlaying,
      transportIntent: this.transportIntent,
      activeTrack: this.transport.activeTrack?.refId ?? null,
    });
  }

  togglePlayPause(): void {
    guard("toggle", this.transport.activeTrack);
    if (!this.transport.activeTrack) return;
    if (this.transportIntent === "playing") this.pause();
    else this.resume();
  }

  toggle(): void {
    this.togglePlayPause();
  }

  stop(): void {
    guard("stop", this.transport.activeTrack);
    playbackDebugLog("SESSION", "stop()");
    globalPlayerEngine.stop();
    this.transportIntent = "paused";
    this.transport = { ...EMPTY_TRANSPORT, volume: this.transport.volume, muted: this.transport.muted };
    this.queueSession.reset();
    this.uiSession.reset();
    this.clearSeekState();
    this.pushLegacyMirror({ detailsOpen: false });
    this.persistence.clearOnStop();
    this.emit();
  }

  commitSeek(seconds: number): void {
    seekPipelineTrace("MediaSessionController.commitSeek", "ENTER", {
      seconds,
      activeTrack: this.transport.activeTrack?.refId ?? null,
      transportCurrentTime: this.transport.currentTime,
      transportDuration: this.transport.duration,
      pendingSeekSeconds: this.pendingSeekSeconds,
      uiIsSeeking: this.uiSession.getState().isSeeking,
      uiSeekPreview: this.uiSession.getState().seekPreviewTime,
    });
    guard("seek", this.transport.activeTrack);
    const target = clampSeekTarget(seconds, this.transport.duration);
    const ui = this.uiSession.getState();
    const nearCurrent =
      this.pendingSeekSeconds === null &&
      !ui.isSeeking &&
      Math.abs(this.transport.currentTime - target) < 0.05;
    seekPipelineTrace("MediaSessionController.commitSeek", "GUARD", {
      condition: "nearCurrent skip",
      pendingSeekSeconds: this.pendingSeekSeconds,
      uiIsSeeking: ui.isSeeking,
      transportCurrentTime: this.transport.currentTime,
      target,
      delta: Math.abs(this.transport.currentTime - target),
      threshold: 0.05,
      decision: nearCurrent ? "EARLY_RETURN" : "PASS",
    });
    if (nearCurrent) {
      seekPipelineTrace("MediaSessionController.commitSeek", "EARLY_RETURN", {
        reason: "pendingSeekSeconds===null && !ui.isSeeking && abs(currentTime-target)<0.05",
        target,
        transportCurrentTime: this.transport.currentTime,
      });
      return;
    }
    this.pendingSeekSeconds = target;
    this.pendingSeekOriginSeconds = this.transport.currentTime;
    this.pendingSeekDeadline = Date.now() + 3000;
    this.seekLockUntil = Date.now() + SEEK_LOCK_MS;
    playbackDebugLog("SESSION", "commitSeek()", { seconds: target });
    seekPipelineTrace("MediaSessionController.commitSeek", "INVOKE", {
      next: "uiSession.clearOnSeekCommit",
      target,
      pendingSeekSeconds: this.pendingSeekSeconds,
    });
    this.uiSession.clearOnSeekCommit();
    seekPipelineTrace("MediaSessionController.commitSeek", "INVOKE", {
      next: "patchTransport",
      currentTime: target,
    });
    this.patchTransport({ currentTime: target });
    this.pushLegacyMirror();
    seekPipelineTrace("MediaSessionController.commitSeek", "INVOKE", {
      next: "globalPlayerEngine.seek",
      target,
    });
    globalPlayerEngine.seek(target);
    seekPipelineTrace("MediaSessionController.commitSeek", "EXIT", {
      target,
      pendingSeekSeconds: this.pendingSeekSeconds,
    });
  }

  seek(seconds: number): void {
    seekPipelineTrace("MediaSessionController.seek", "ENTER", { seconds });
    seekPipelineTrace("MediaSessionController.seek", "INVOKE", { next: "commitSeek", seconds });
    this.commitSeek(seconds);
    seekPipelineTrace("MediaSessionController.seek", "EXIT", { seconds });
  }

  skipForward(seconds = 10): void {
    const max =
      this.transport.duration > 0 ? this.transport.duration : this.transport.currentTime + seconds;
    this.commitSeek(Math.min(this.transport.currentTime + seconds, max));
  }

  skipBackward(seconds = 10): void {
    this.commitSeek(Math.max(0, this.transport.currentTime - seconds));
  }

  next(): void {
    guard("next", this.transport.activeTrack);
    if (!this.transport.activeTrack) return;
    const { queue, queueIndex } = this.queueSession.getState();
    const target = resolveNextQueueTarget(queue, queueIndex);
    queuePipelineTrace({
      fn: "MediaSessionController.next",
      phase: "enter",
      event: "next",
      currentQueueIndex: queueIndex,
      targetQueueIndex: target?.queueIndex ?? null,
      queueLength: queue.length,
      currentActiveTrack: this.transport.activeTrack?.refId ?? null,
      targetActiveTrack: target?.item.refId ?? null,
    });
    if (!target) {
      queuePipelineTrace({ fn: "MediaSessionController.next", phase: "early_return_end_of_queue" });
      return;
    }
    this.play(target.item, { browse: { queue, queueIndex: target.queueIndex } });
  }

  prev(): void {
    guard("prev", this.transport.activeTrack);
    if (!this.transport.activeTrack) return;
    const currentTime = this.transport.currentTime;
    if (currentTime > 3) {
      queuePipelineTrace({
        fn: "MediaSessionController.prev",
        phase: "restart_current",
        event: "prev",
        currentTime,
        note: "currentTime > 3 → commitSeek(0)",
      });
      this.commitSeek(0);
      return;
    }
    const { queue, queueIndex } = this.queueSession.getState();
    const target = resolvePreviousQueueTarget(queue, queueIndex);
    queuePipelineTrace({
      fn: "MediaSessionController.prev",
      phase: "enter",
      event: "prev",
      currentQueueIndex: queueIndex,
      targetQueueIndex: target?.queueIndex ?? null,
      queueLength: queue.length,
      currentActiveTrack: this.transport.activeTrack?.refId ?? null,
      targetActiveTrack: target?.item.refId ?? null,
      currentTime,
    });
    if (!target) {
      queuePipelineTrace({ fn: "MediaSessionController.prev", phase: "early_return_start_of_queue" });
      return;
    }
    this.play(target.item, { browse: { queue, queueIndex: target.queueIndex } });
  }

  setVolume(volume: number): void {
    guard("setVolume", this.transport.activeTrack);
    const track = this.transport.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    const prevVolume = this.transport.volume;
    const prevMuted = this.transport.muted;
    const clamped = Math.max(0, Math.min(1, volume));
    const muted = clamped === 0;
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.setVolume",
      phase: "enter",
      previousVolume: prevVolume,
      newVolume: clamped,
      previousMuted: prevMuted,
      newMuted: muted,
      muteChanged: prevMuted !== muted,
      providerKind: kind,
      note: kind === "preview" ? "will_forward_engine" : "msc_only_non_preview",
    });
    if (clamped > 0) this.lastAudibleVolume = clamped;
    if (kind === "preview") {
      globalPlayerEngine.setVolume(clamped);
      globalPlayerEngine.setMuted(muted);
    }
    this.patchTransport({ volume: clamped, muted }, true);
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.setVolume",
      phase: "exit",
      newVolume: clamped,
      newMuted: muted,
      mscOverwrote: true,
      storeVolume: clamped,
      storeMuted: muted,
    });
  }

  toggleMute(): void {
    guard("toggleMute", this.transport.activeTrack);
    const track = this.transport.activeTrack;
    const kind = track ? resolvePlaybackSource(track).kind : null;
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.toggleMute",
      phase: "enter",
      previousVolume: this.transport.volume,
      previousMuted: this.transport.muted,
      providerKind: kind,
      note: kind !== "preview" ? "early_return_non_preview" : undefined,
    });
    if (kind !== "preview") return;
    if (this.transport.muted) {
      const restore =
        this.transport.volume > 0 ? this.transport.volume : this.lastAudibleVolume;
      this.setVolume(restore);
      return;
    }
    if (this.transport.volume > 0) this.lastAudibleVolume = this.transport.volume;
    globalPlayerEngine.setMuted(true);
    this.patchTransport({ muted: true, volume: this.transport.volume }, true);
    volumePipelineTrace({
      initiator: "MediaSessionController",
      fn: "MediaSessionController.toggleMute",
      phase: "exit_muted",
      previousMuted: false,
      newMuted: true,
      newVolume: this.transport.volume,
      muteChanged: true,
      mscOverwrote: true,
    });
  }

  retry(): void {
    const item = this.transport.activeTrack;
    if (!item) return;
    const { queue, queueIndex } = this.queueSession.getState();
    this.play(item, { browse: { queue, queueIndex } });
  }

  advanceQueueOnEnd(): void {
    const { queue, queueIndex } = this.queueSession.getState();
    const result = resolveAdvanceOnEnd(queue, queueIndex);
    queuePipelineTrace({
      fn: "MediaSessionController.advanceQueueOnEnd",
      phase: "enter",
      event: "auto_advance",
      currentQueueIndex: queueIndex,
      targetQueueIndex: result.kind === "advance" ? result.target.queueIndex : null,
      queueLength: queue.length,
      currentActiveTrack: this.transport.activeTrack?.refId ?? null,
      targetActiveTrack: result.kind === "advance" ? result.target.item.refId : null,
    });
    if (result.kind === "end") {
      queuePipelineTrace({ fn: "MediaSessionController.advanceQueueOnEnd", phase: "end_of_queue" });
      this.transportIntent = "paused";
      this.patchTransport({ isPlaying: false, isBuffering: false, isInitialLoading: false }, true);
      return;
    }
    const { target } = result;
    playbackDebugLog("QUEUE", "preview ended — advancing", { to: target.item.refId, nextIndex: target.queueIndex });
    this.play(target.item, { browse: { queue, queueIndex: target.queueIndex } });
  }

  flushPendingPlay(): void {
    if (!this.pendingPlayItem) return;
    const item = this.pendingPlayItem;
    this.pendingPlayItem = null;
    this.play(item);
  }

  // ── UI presentation (delegated) ─────────────────────────────────────────────

  beginSeek(seconds: number): void {
    seekPipelineTrace("MediaSessionController.beginSeek", "ENTER", {
      seconds,
      duration: this.transport.duration,
    });
    this.uiSession.beginSeek(seconds, this.transport.duration);
    this.emit();
    seekPipelineTrace("MediaSessionController.beginSeek", "EXIT", {
      ui: this.uiSession.getState(),
    });
  }

  updateSeek(seconds: number): void {
    seekPipelineTrace("MediaSessionController.updateSeek", "ENTER", {
      seconds,
      duration: this.transport.duration,
      uiIsSeeking: this.uiSession.getState().isSeeking,
    });
    const updated = this.uiSession.updateSeek(seconds, this.transport.duration);
    if (!updated) {
      seekPipelineTrace("MediaSessionController.updateSeek", "EARLY_RETURN", {
        reason: "uiSession.updateSeek returned null",
        uiIsSeeking: this.uiSession.getState().isSeeking,
      });
      return;
    }
    this.emit();
    seekPipelineTrace("MediaSessionController.updateSeek", "EXIT", { ui: updated });
  }

  setHoverPreview(seconds: number): void {
    if (!this.uiSession.setHoverPreview(seconds, this.transport.duration)) return;
    this.emit();
  }

  clearHoverPreview(): void {
    if (!this.uiSession.clearHoverPreview()) return;
    this.emit();
  }

  // ── Persistence bootstrap (session only) ────────────────────────────────────

  hydratePausedSession(
    track: PlaybackItem,
    position: number,
    queue: PlaybackItem[],
    queueIndex: number,
  ): void {
    hydrationTraceMarkStart("MediaSessionController.hydrate");
    hydrationPipelineTrace({
      fn: "MediaSessionController.hydrate",
      phase: "hydratePausedSession_ENTER",
      persisted: {
        activeTrack: track.refId,
        queueLength: queue.length,
        queueIndex,
        currentTime: position,
        isPlaying: false,
      },
    });
    const hydrated = this.persistence.hydratePausedSession(track, position, queue, queueIndex);
    this.transportIntent = "paused";
    this.queueSession.setQueue(hydrated.queue, hydrated.queueIndex);
    this.transport = {
      ...this.transport,
      activeTrack: hydrated.track,
      currentTime: hydrated.position,
      isPlaying: false,
      isBuffering: false,
      error: null,
    };
    this.pushLegacyMirror({ hydrated: true });
    this.emit();
    hydrationPipelineTrace({
      fn: "MediaSessionController.hydrate",
      phase: "hydratePausedSession_EXIT",
      msc: {
        activeTrack: hydrated.track.refId,
        queueLength: hydrated.queue.length,
        queueIndex: hydrated.queueIndex,
        currentTime: hydrated.position,
        isPlaying: false,
      },
    });
    hydrationTraceMarkFinish("MediaSessionController.hydrate");
  }

  hydrateQueue(queue: PlaybackItem[], queueIndex: number): void {
    hydrationPipelineTrace({
      fn: "MediaSessionController.hydrate",
      phase: "hydrateQueue_ENTER",
      extra: { queueLength: queue.length, queueIndex },
    });
    const hydrated = this.persistence.hydrateQueue(queue, queueIndex);
    this.queueSession.setQueue(hydrated.queue, hydrated.queueIndex);
    this.pushLegacyMirror({ hydrated: true });
    this.emit();
    hydrationPipelineTrace({
      fn: "MediaSessionController.hydrate",
      phase: "hydrateQueue_EXIT",
      msc: {
        queueLength: hydrated.queue.length,
        queueIndex: hydrated.queueIndex,
      },
    });
  }

  __resetForTests(): void {
    this.transport = { ...EMPTY_TRANSPORT };
    this.queueSession.reset();
    this.uiSession.reset();
    this.listeners.clear();
    this.engineAttached = false;
    this.pendingPlayItem = null;
    this.transportIntent = "paused";
    this.hadTrackBefore = false;
    this.lastAudibleVolume = 0.8;
    this.clearSeekState();
  }
}

export const mediaSessionController = new MediaSessionController();
