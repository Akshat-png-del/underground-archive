import type { PlaybackItem } from "@/lib/music/playback";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import type { ProviderKind } from "@/lib/music/providers/playback-provider";
import { ProviderRouter } from "@/lib/music/providers/provider-router";
import { mediaEngineEvents } from "@/lib/music/media-engine-events";
import { logSeekExecuted } from "@/lib/music/media-binding-debug";
import { waitForPlaybackMediaAnchor } from "@/lib/music/playback-media-anchor-registry";
import {
  playbackDebugLog,
  playbackDebugWarn,
  playbackDebugError,
  probePlaybackDom,
} from "@/lib/music/playback-debug";

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
 * Immutable runtime MediaEngine — singleton, lives outside the React tree.
 * Providers execute commands; this layer owns playback truth.
 */
class GlobalPlayerEngine {
  private container: HTMLDivElement | null = null;
  private router: ProviderRouter | null = null;
  private listener: StateListener | null = null;
  private mounted = false;
  private routerInitialized = false;

  private generation = 0;
  private activeGeneration = 0;

  private mode: PlayerEngineMode = "idle";
  private currentTrack: PlaybackItem | null = null;
  private isPlaying = false;
  private isLoading = false;
  private currentTime = 0;
  private duration = 0;
  private error: string | null = null;

  private prevPlaying = false;
  private readyEmittedForTrack: string | null = null;

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
    this.listener?.(this.getSnapshot());
  }

  private applyProviderState(providerState: {
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    error: string | null;
  }): void {
    const wasPlaying = this.isPlaying;
    const prevTime = this.currentTime;

    this.isPlaying = providerState.isPlaying;
    this.isLoading = providerState.isLoading;
    this.currentTime = providerState.currentTime;
    this.duration = providerState.duration;
    this.error = providerState.error;
    this.mode = modeFromKind(this.router?.getActiveKind() ?? null);

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

    if (
      this.mode === "audio" &&
      wasPlaying &&
      !providerState.isPlaying &&
      !providerState.isLoading &&
      !providerState.error &&
      providerState.currentTime === 0 &&
      this.duration > 0
    ) {
      mediaEngineEvents.emit({ type: "onEnded", track: this.currentTrack });
    }

    const trackKey = this.currentTrack?.refId ?? null;
    if (
      !providerState.isLoading &&
      !providerState.error &&
      providerState.isPlaying &&
      trackKey &&
      this.readyEmittedForTrack !== trackKey
    ) {
      this.readyEmittedForTrack = trackKey;
      mediaEngineEvents.emit({ type: "onReady", track: this.currentTrack });
    }

    this.prevPlaying = providerState.isPlaying;
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
      applyEmbedContainerStyles(this.container);
      return;
    }

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
    this.readyEmittedForTrack = null;

    if (trackChanged) {
      this.currentTime = 0;
      this.duration = 0;
      mediaEngineEvents.emit({ type: "onTrackChange", track: item });
    }

    this.isLoading = true;
    this.isPlaying = false;
    this.error = null;
    this.publish();

    void waitForPlaybackMediaAnchor()
      .then(() => {
        if (this.isStale(generation)) return { issue: null as string | null };
        this.mount();
        const activeRouter = this.ensureRouter();
        if (!activeRouter) return { issue: "Media engine not mounted" };
        return activeRouter.play(item, generation);
      })
      .then((result) => {
        if (!result || this.isStale(generation)) return;
        const { issue } = result;
        if (issue) {
          this.mode = "idle";
          this.isPlaying = false;
          this.isLoading = false;
          this.error = issue;
          mediaEngineEvents.emit({ type: "onError", error: issue, track: item });
          this.publish();
        }
      })
      .catch((err) => {
        if (this.isStale(generation)) return;
        const issue = err instanceof Error ? err.message : String(err);
        this.mode = "idle";
        this.isPlaying = false;
        this.isLoading = false;
        this.error = issue;
        mediaEngineEvents.emit({ type: "onError", error: issue, track: item });
        this.publish();
      });
  }

  pause(): void {
    playbackDebugLog("ENGINE", "pause requested", { mode: this.mode, refId: this.currentTrack?.refId });
    this.router?.pause();
  }

  resume(): void {
    playbackDebugLog("ENGINE", "resume requested", {
      mode: this.mode,
      refId: this.currentTrack?.refId,
    });
    if (!this.currentTrack) return;
    if (this.router?.getActiveKind()) {
      this.router.resume();
      return;
    }
    this.play(this.currentTrack);
  }

  stop(): void {
    playbackDebugLog("PLAYER", "stopping old track", { reason: "stop" });
    this.bumpGeneration();
    this.router?.stop();
    this.mode = "idle";
    this.currentTrack = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.currentTime = 0;
    this.duration = 0;
    this.error = null;
    this.prevPlaying = false;
    this.readyEmittedForTrack = null;
    mediaEngineEvents.emit({ type: "onTrackChange", track: null });
    this.publish();
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, seconds);
    playbackDebugLog("SEEK", "engine seek requested", { seconds: clamped, mode: this.mode });
    mediaEngineEvents.emit({ type: "onSeek", time: clamped });
    logSeekExecuted(clamped, this.router?.getActiveKind() ?? null);
    this.router?.seek(clamped);
  }

  setVolume(volume: number): void {
    this.router?.setVolume(volume);
  }

  setMuted(muted: boolean): void {
    this.router?.setMuted(muted);
  }

  getSnapshot(): PlayerEngineState {
    const providerState = this.router?.getState();
    const activeKind = this.router?.getActiveKind();
    const useProviderTransport = !!providerState && !!activeKind;

    return {
      mode: this.mode,
      currentTrack: this.currentTrack,
      isPlaying: useProviderTransport ? providerState.isPlaying : this.isPlaying,
      isLoading: useProviderTransport ? providerState.isLoading : this.isLoading,
      currentTime: useProviderTransport ? providerState.currentTime : this.currentTime,
      duration: useProviderTransport ? providerState.duration : this.duration,
      error: useProviderTransport ? providerState.error : this.error,
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
