import type { PlaybackItem } from "@/lib/music/playback";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import type { ProviderKind } from "@/lib/music/providers/playback-provider";
import type { ProviderState } from "@/lib/music/providers/playback-provider";
import { EMPTY_PROVIDER_STATE } from "@/lib/music/providers/playback-provider";
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

    if (
      mode === "audio" &&
      wasPlaying &&
      !providerState.isPlaying &&
      !providerState.isLoading &&
      !providerState.error &&
      providerState.currentTime === 0 &&
      providerState.duration > 0
    ) {
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

    if (trackChanged) {
      mediaEngineEvents.emit({ type: "onTrackChange", track: item });
    }

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
          this.lastProviderState = null;
          this.publishCommandFailure(issue, item);
        }
      })
      .catch((err) => {
        if (this.isStale(generation)) return;
        const issue = err instanceof Error ? err.message : String(err);
        this.mode = "idle";
        this.lastProviderState = null;
        this.publishCommandFailure(issue, item);
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
    this.lastProviderState = null;
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
