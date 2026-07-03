import type { PlaybackItem } from "@/lib/music/playback";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import type { ProviderKind } from "@/lib/music/providers/playback-provider";
import type { ProviderState } from "@/lib/music/providers/playback-provider";
import { EMPTY_PROVIDER_STATE } from "@/lib/music/providers/playback-provider";
import { ProviderRouter } from "@/lib/music/providers/provider-router";
import { mediaEngineEvents } from "@/lib/music/media-engine-events";
import { logSeekExecuted } from "@/lib/music/media-binding-debug";
import {
  getProviderMountNode,
  isPlaybackMediaAnchorReady,
  waitForPlaybackMediaAnchor,
} from "@/lib/music/playback-media-anchor-registry";
import {
  playbackDebugLog,
  playbackDebugWarn,
  playbackDebugError,
  probePlaybackDom,
} from "@/lib/music/playback-debug";
import { syncAuditRecord } from "@/lib/music/playback-sync-audit";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";
import { volumePipelineTrace } from "@/lib/music/volume-pipeline-trace";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";
import { playPausePipelineTrace, isDuplicateCommand } from "@/lib/music/play-pause-pipeline-trace";
import {
  hydrationPipelineTrace,
  hydrationTraceMarkEngineInit,
} from "@/lib/music/hydration-pipeline-trace";

const ROOT_ID = "vitalforge-playback-root";
const EMBED_WIDTH = 352;
const EMBED_HEIGHT = 152;

function applyEmbedContainerStyles(container: HTMLDivElement): void {
  const docked =
    typeof container.closest === "function" &&
    !!container.closest("[data-player-embed-host]");
  const rules = [
    docked ? "position:absolute" : "position:fixed",
    docked ? "inset:0" : "",
    docked ? "" : "left:0",
    docked ? "" : "bottom:0",
    docked ? "width:100%" : `width:${EMBED_WIDTH}px`,
    docked ? "height:100%" : `height:${EMBED_HEIGHT}px`,
    "overflow:hidden",
    "pointer-events:none",
    docked ? "z-index:1" : "z-index:39",
    "border:0",
    "opacity:1",
    "visibility:visible",
    "display:block",
    "flex-shrink:0",
  ].filter(Boolean);
  container.style.cssText = rules.join(";");
}

function modeFromResolvedKind(kind: ReturnType<typeof resolvePlaybackSource>["kind"]): PlayerEngineMode {
  if (kind === "preview") return "audio";
  if (kind === "spotify") return "spotify";
  if (kind === "youtube") return "embed";
  return "idle";
}

function modeFromKind(kind: ProviderKind | null): PlayerEngineMode {
  if (!kind) return "idle";
  if (kind === "youtube") return "embed";
  return kind;
}

function idleTransportState(): Pick<
  PlayerEngineState,
  "isPlaying" | "isLoading" | "currentTime" | "duration" | "error"
> {
  return { ...EMPTY_PROVIDER_STATE };
}

export type PlayerEngineMode = "idle" | "audio" | "embed" | "spotify";

export interface PlayerEngineState {
  mode: PlayerEngineMode;
  currentTrack: PlaybackItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

type StateListener = (state: PlayerEngineState) => void;

/**
 * Runtime MediaEngine — singleton executor outside the React tree.
 * Forwards provider-reported transport to MediaSessionController via setStateListener.
 */
class GlobalPlayerEngine {
  private container: HTMLDivElement | null = null;
  private router: ProviderRouter | null = null;
  private listener: StateListener | null = null;
  private mounted = false;
  private routerInitialized = false;

  private generation = 0;
  private activeGeneration = 0;

  /** Execution routing — which item/mode was commanded. */
  private mode: PlayerEngineMode = "idle";
  private currentTrack: PlaybackItem | null = null;

  /** Prior provider report — event edge detection only, not transport authority. */
  private lastProviderState: ProviderState | null = null;
  /** Dedupes onEnded per track — Spotify stays isPlaying=true at duration. */
  private endedEmittedForRef: string | null = null;

  setStateListener(listener: StateListener | null): void {
    this.listener = listener;
    if (listener) {
      listener(this.getSnapshot());
    }
  }

  getGeneration(): number {
    return this.activeGeneration;
  }

  isEngineMounted(): boolean {
    return this.mounted && !!this.container?.isConnected;
  }

  private publish(): void {
    const snap = this.getSnapshot();
    syncAuditRecord({
      ts: Date.now(),
      action: "engine-publish",
      layer: "engine",
      currentTime: snap.currentTime,
      duration: snap.duration,
      isPlaying: snap.isPlaying,
      volume: null,
      muted: null,
      isLoading: snap.isLoading,
      currentTrack: snap.currentTrack?.refId ?? null,
    });
    this.listener?.(snap);
  }

  private publishCommandFailure(issue: string, track: PlaybackItem): void {
    mediaEngineEvents.emit({ type: "onError", error: issue, track });
    this.listener?.({
      mode: "idle",
      currentTrack: track,
      ...idleTransportState(),
      error: issue,
    });
  }

  private applyProviderState(providerState: ProviderState): void {
    const wasPlaying = this.lastProviderState?.isPlaying ?? false;
    const prevTime = this.lastProviderState?.currentTime ?? 0;
    const activeKind = this.router?.getActiveKind() ?? null;
    const mode = modeFromKind(activeKind);

    if (providerState.isPlaying && !wasPlaying) {
      mediaEngineEvents.emit({ type: "onPlay", track: this.currentTrack });
    }
    if (!providerState.isPlaying && wasPlaying) {
      mediaEngineEvents.emit({ type: "onPause", track: this.currentTrack });
    }
    if (providerState.currentTime !== prevTime) {
      mediaEngineEvents.emit({
        type: "onTimeUpdate",
        currentTime: providerState.currentTime,
        duration: providerState.duration,
      });
    }
    if (providerState.error) {
      mediaEngineEvents.emit({
        type: "onError",
        error: providerState.error,
        track: this.currentTrack,
      });
    }

    const duration = providerState.duration;
    const atEnd = duration > 0 && providerState.currentTime >= duration - 0.25;
    const ref = this.currentTrack?.refId ?? null;
    let emitEnded = false;

    if ((mode === "audio" || mode === "spotify") && atEnd && !providerState.error && ref) {
      if (this.endedEmittedForRef !== ref) {
        if (mode === "spotify") {
          const crossedEnd = prevTime < duration - 0.25;
          emitEnded =
            crossedEnd ||
            (wasPlaying && !providerState.isPlaying && !providerState.isLoading);
        } else {
          emitEnded =
            wasPlaying && !providerState.isPlaying && !providerState.isLoading;
        }
      }
    }

    if (emitEnded) {
      this.endedEmittedForRef = ref;
      queuePipelineTrace({
        fn: "GlobalPlayerEngine.applyProviderState",
        phase: "onEnded",
        event: "track_end",
        currentActiveTrack: ref,
        providerKind: activeKind,
        extra: {
          currentTime: providerState.currentTime,
          duration,
          wasPlaying,
          isPlaying: providerState.isPlaying,
        },
      });
      mediaEngineEvents.emit({ type: "onEnded", track: this.currentTrack });
    }

    this.mode = mode;
    this.lastProviderState = { ...providerState };
    this.publish();
  }

  private bumpGeneration(): number {
    this.generation += 1;
    this.activeGeneration = this.generation;
    return this.activeGeneration;
  }

  private isStale(generation: number): boolean {
    return generation !== this.activeGeneration;
  }

  private ensureRouter(): ProviderRouter | null {
    if (!this.container) return null;
    if (this.routerInitialized && this.router) return this.router;

    if (this.routerInitialized) {
      playbackDebugError("MOUNT", "[INVARIANT FAILED] ProviderRouter reinitialization blocked");
      return this.router;
    }

    this.router = new ProviderRouter();
    this.routerInitialized = true;
    hydrationPipelineTrace({
      fn: "GlobalPlayerEngine.initialize",
      phase: "provider_router_created",
    });
    this.router.setStateListener((providerState) => {
      this.applyProviderState(providerState);
    });
    mediaEngineEvents.emit({ type: "onInit" });
    return this.router;
  }

  mount(): void {
    if (typeof document === "undefined") return;

    if (this.mounted && this.container?.isConnected) {
      playbackDebugLog("MOUNT", "MediaEngine already mounted — skipping remount");
      hydrationPipelineTrace({
        fn: "GlobalPlayerEngine.initialize",
        phase: "mount_skipped",
        engine: this.getSnapshot(),
      });
      applyEmbedContainerStyles(this.container);
      return;
    }

    hydrationTraceMarkEngineInit("GlobalPlayerEngine.mount");
    hydrationPipelineTrace({
      fn: "GlobalPlayerEngine.initialize",
      phase: "mount_ENTER",
    });

    let container = document.getElementById(ROOT_ID) as HTMLDivElement | null;
    if (container && !container.isConnected) {
      playbackDebugLog("MOUNT", "engine root detached — reattaching to body");
      document.body.appendChild(container);
    }
    if (!container) {
      container = document.createElement("div");
      container.id = ROOT_ID;
      container.setAttribute("data-global-player", "true");
      document.body.appendChild(container);
      playbackDebugLog("MOUNT", "engine created #vitalforge-playback-root on document.body");
    } else {
      playbackDebugLog("MOUNT", "engine reusing existing #vitalforge-playback-root");
    }

    applyEmbedContainerStyles(container);
    this.container = container;
    this.mounted = true;
    this.ensureRouter();

    hydrationPipelineTrace({
      fn: "GlobalPlayerEngine.initialize",
      phase: "mount_EXIT",
      engine: {
        activeTrack: this.currentTrack?.refId ?? null,
        engineMode: this.getSnapshot().mode,
      },
    });
    playbackDebugLog("MOUNT", "MediaEngine mount complete", probePlaybackDom());
  }

  play(item: PlaybackItem): void {
    if (!this.mounted) {
      playbackDebugWarn("MOUNT", "play requested before engine mount — mounting now");
    }
    this.mount();
    const router = this.ensureRouter();
    if (!router) return;

    const generation = this.bumpGeneration();
    const resolved = resolvePlaybackSource(item);

    playbackDebugLog("ENGINE", "play requested", {
      refId: item.refId,
      type: item.type,
      generation,
      engineMounted: this.isEngineMounted(),
    });

    const trackChanged = this.currentTrack?.refId !== item.refId;
    this.currentTrack = item;
    this.mode = modeFromResolvedKind(resolved.kind);

    queuePipelineTrace({
      fn: "GlobalPlayerEngine.play",
      phase: "invoke",
      targetActiveTrack: item.refId,
      engineActiveTrack: item.refId,
      trackChanged,
      providerKind: resolved.kind,
    });

    if (trackChanged) {
      this.endedEmittedForRef = null;
      mediaEngineEvents.emit({ type: "onTrackChange", track: item });
    }

    const handlePlayResult = (result: { issue: string | null } | undefined) => {
      if (!result || this.isStale(generation)) return;
      const { issue } = result;
      if (issue) {
        this.mode = "idle";
        this.lastProviderState = null;
        this.publishCommandFailure(issue, item);
      }
    };

    const handlePlayError = (err: unknown) => {
      if (this.isStale(generation)) return;
      const issue = err instanceof Error ? err.message : String(err);
      this.mode = "idle";
      this.lastProviderState = null;
      this.publishCommandFailure(issue, item);
    };

    const invokeRouterPlay = (): Promise<{ issue: string | null } | undefined> => {
      if (this.isStale(generation)) return Promise.resolve({ issue: null });
      const activeRouter = this.ensureRouter();
      if (!activeRouter) return Promise.resolve({ issue: "Media engine not mounted" });
      return activeRouter.play(item, generation);
    };

    if (isPlaybackMediaAnchorReady() && getProviderMountNode()) {
      void invokeRouterPlay().then(handlePlayResult).catch(handlePlayError);
      return;
    }

    void waitForPlaybackMediaAnchor()
      .then(() => {
        if (this.isStale(generation)) return { issue: null as string | null };
        this.mount();
        return invokeRouterPlay();
      })
      .then(handlePlayResult)
      .catch(handlePlayError);
  }

  pause(): void {
    playbackDebugLog("ENGINE", "pause requested", { mode: this.mode, refId: this.currentTrack?.refId });
    const providerPlaying = this.router?.getState().isPlaying ?? null;
    playPausePipelineTrace({
      fn: "GlobalPlayerEngine.pause",
      phase: "ENTER",
      event: "pause",
      duplicateCommand: isDuplicateCommand("engine-pause"),
      engineIsPlaying: providerPlaying,
      providerIsPlaying: providerPlaying,
      activeTrack: this.currentTrack?.refId ?? null,
    });
    this.router?.pause();
    playPausePipelineTrace({
      fn: "GlobalPlayerEngine.pause",
      phase: "EXIT",
      event: "pause",
      engineIsPlaying: this.getSnapshot().isPlaying,
      providerIsPlaying: this.router?.getState().isPlaying ?? null,
      activeTrack: this.currentTrack?.refId ?? null,
    });
  }

  resume(): void {
    playbackDebugLog("ENGINE", "resume requested", {
      mode: this.mode,
      refId: this.currentTrack?.refId,
    });
    const providerPlaying = this.router?.getState().isPlaying ?? null;
    playPausePipelineTrace({
      fn: "GlobalPlayerEngine.resume",
      phase: "ENTER",
      event: "resume",
      duplicateCommand: isDuplicateCommand("engine-resume"),
      engineIsPlaying: providerPlaying,
      providerIsPlaying: providerPlaying,
      activeTrack: this.currentTrack?.refId ?? null,
    });
    if (!this.currentTrack) return;
    if (this.router?.getActiveKind()) {
      this.router.resume();
      playPausePipelineTrace({
        fn: "GlobalPlayerEngine.resume",
        phase: "EXIT",
        event: "resume",
        engineIsPlaying: this.getSnapshot().isPlaying,
        providerIsPlaying: this.router?.getState().isPlaying ?? null,
        activeTrack: this.currentTrack?.refId ?? null,
      });
      return;
    }
    this.play(this.currentTrack);
    playPausePipelineTrace({
      fn: "GlobalPlayerEngine.resume",
      phase: "EXIT",
      event: "resume",
      note: "fell through to play()",
      engineIsPlaying: this.getSnapshot().isPlaying,
      activeTrack: this.currentTrack?.refId ?? null,
    });
  }

  stop(): void {
    playbackDebugLog("PLAYER", "stopping old track", { reason: "stop" });
    this.bumpGeneration();
    this.router?.stop();
    this.mode = "idle";
    this.currentTrack = null;
    this.lastProviderState = null;
    this.endedEmittedForRef = null;
    mediaEngineEvents.emit({ type: "onTrackChange", track: null });
    this.publish();
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, seconds);
    seekPipelineTrace("GlobalPlayerEngine.seek", "ENTER", {
      seconds: clamped,
      mode: this.mode,
      refId: this.currentTrack?.refId ?? null,
      routerPresent: !!this.router,
      activeKind: this.router?.getActiveKind() ?? null,
    });
    playbackDebugLog("SEEK", "engine seek requested", { seconds: clamped, mode: this.mode });
    mediaEngineEvents.emit({ type: "onSeek", time: clamped });
    logSeekExecuted(clamped, this.router?.getActiveKind() ?? null);
    seekPipelineTrace("GlobalPlayerEngine.seek", "INVOKE", {
      next: "ProviderRouter.seek",
      seconds: clamped,
    });
    this.router?.seek(clamped);
    seekPipelineTrace("GlobalPlayerEngine.seek", "EXIT", { seconds: clamped });
  }

  setVolume(volume: number): void {
    volumePipelineTrace({
      initiator: "GlobalPlayerEngine",
      fn: "GlobalPlayerEngine.setVolume",
      phase: "invoke",
      newVolume: volume,
      activeRouterKind: this.router?.getActiveKind() ?? null,
    });
    this.router?.setVolume(volume);
  }

  setMuted(muted: boolean): void {
    volumePipelineTrace({
      initiator: "GlobalPlayerEngine",
      fn: "GlobalPlayerEngine.setMuted",
      phase: "invoke",
      newMuted: muted,
      activeRouterKind: this.router?.getActiveKind() ?? null,
    });
    this.router?.setMuted(muted);
  }

  getSnapshot(): PlayerEngineState {
    const activeKind = this.router?.getActiveKind();
    if (activeKind) {
      const providerState = this.router!.getState();
      return {
        mode: modeFromKind(activeKind),
        currentTrack: this.currentTrack,
        isPlaying: providerState.isPlaying,
        isLoading: providerState.isLoading,
        currentTime: providerState.currentTime,
        duration: providerState.duration,
        error: providerState.error,
      };
    }

    return {
      mode: this.mode,
      currentTrack: this.currentTrack,
      ...idleTransportState(),
    };
  }

  reapplyEmbedLayout(): void {
    if (this.container) applyEmbedContainerStyles(this.container);
  }
}

export const globalPlayerEngine = new GlobalPlayerEngine();

/** Immutable MediaEngine singleton alias. */
export const mediaEngine = globalPlayerEngine;

/** @internal Test-only: reset engine between stress-test runs. */
export function __resetGlobalPlayerEngineForTests(): void {
  globalPlayerEngine.stop();
}
