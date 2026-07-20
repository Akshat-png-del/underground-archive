import {
  SpotifyEmbedHost,
  spotifyUriFromUrl,
  type SpotifyEmbedController,
} from "@/lib/music/spotify-embed-api";
import type {
  PlaybackProvider,
  ProviderPlayRequest,
  ProviderState,
  ProviderStateListener,
} from "@/lib/music/providers/playback-provider";
import { EMPTY_PROVIDER_STATE } from "@/lib/music/providers/playback-provider";
import { ProviderReadyGate } from "@/lib/music/providers/provider-ready-gate";
import {
  logProviderInit,
  logProviderLoad,
  logProviderPause,
  logProviderPlay,
} from "@/lib/music/providers/provider-debug";
import { playbackDebugWarn } from "@/lib/music/playback-debug";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";
import { playPausePipelineTrace, isDuplicateCommand } from "@/lib/music/play-pause-pipeline-trace";
import {
  clampPlaybackPosition,
  spotifyPlaybackFields,
} from "@/lib/music/audio-transport-sync";
import {
  spotifySeekAudit,
  spotifySeekAuditMarkSeek,
  spotifySeekAuditRecordPlaybackUpdate,
  spotifySeekAuditLastPlaybackUpdate,
} from "@/lib/music/spotify-seek-audit";
import { volumePipelineTrace } from "@/lib/music/volume-pipeline-trace";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";

const EMBED_WIDTH = 352;
const EMBED_HEIGHT = 152;
const ROOT_ID = "vitalforge-playback-root";
const MOUNT_LAYOUT_TIMEOUT_MS = 5000;
const EMBED_READY_TIMEOUT_MS = 15000;

export class SpotifyProvider implements PlaybackProvider {
  readonly kind = "spotify" as const;

  private readonly host = new SpotifyEmbedHost();
  private mountNode: HTMLElement | null = null;
  private controller: SpotifyEmbedController | null = null;
  private listener: ProviderStateListener | null = null;
  private generation = 0;
  private activeGeneration = 0;
  private state: ProviderState = { ...EMPTY_PROVIDER_STATE };
  private onStarted: ((payload?: { data?: Record<string, unknown> }) => void) | null = null;
  private onUpdate: ((payload?: { data?: Record<string, unknown> }) => void) | null = null;
  private activeRefId: string | null = null;
  private readonly readyGate = new ProviderReadyGate();
  private mountPromise: Promise<SpotifyEmbedController> | null = null;

  get isReady(): boolean {
    return this.readyGate.isReady;
  }

  attach(domNode: HTMLElement): void {
    if (!domNode.isConnected) {
      throw new Error("SpotifyProvider.attach: DOM node is not connected");
    }
    this.mountNode = domNode;
  }

  /** Validates attach only — createController is deferred to load() after layout is valid. */
  async init(): Promise<void> {
    if (!this.mountNode?.isConnected) {
      throw new Error("SpotifyProvider.init: provider not attached");
    }
    logProviderInit("spotify");
  }

  onReady(callback: () => void): () => void {
    return this.readyGate.onReady(callback);
  }

  onError(callback: (message: string) => void): () => void {
    return this.readyGate.onError(callback);
  }

  waitUntilReady(): Promise<void> {
    return this.readyGate.waitUntilReady();
  }

  setStateListener(listener: ProviderStateListener | null): void {
    this.listener = listener;
  }

  private bumpGeneration(): number {
    this.generation += 1;
    this.activeGeneration = this.generation;
    this.readyGate.reset();
    return this.activeGeneration;
  }

  private isStale(generation: number): boolean {
    return generation !== this.activeGeneration;
  }

  private patch(partial: Partial<ProviderState>, reason?: string): void {
    const before = { ...this.state };
    const next = { ...this.state, ...partial };
    if (
      next.currentTime === before.currentTime &&
      next.duration === before.duration &&
      next.isPlaying === before.isPlaying &&
      next.isLoading === before.isLoading &&
      next.error === before.error
    ) {
      return;
    }
    this.state = next;
    spotifySeekAudit("SpotifyProvider", "STATE_PATCH", {
      reason: reason ?? "patch",
      before: {
        currentTime: before.currentTime,
        duration: before.duration,
        isPlaying: before.isPlaying,
        isLoading: before.isLoading,
      },
      after: {
        currentTime: this.state.currentTime,
        duration: this.state.duration,
        isPlaying: this.state.isPlaying,
        isLoading: this.state.isLoading,
      },
    });
    this.listener?.(this.getState());
  }

  private clearListeners(): void {
    if (this.controller && this.onStarted) {
      this.controller.removeListener?.("playback_started", this.onStarted);
    }
    if (this.controller && this.onUpdate) {
      this.controller.removeListener?.("playback_update", this.onUpdate);
    }
    this.onStarted = null;
    this.onUpdate = null;
  }

  private bindController(generation: number, controller: SpotifyEmbedController): void {
    this.clearListeners();
    this.controller = controller;

    this.onStarted = (payload) => {
      if (this.isStale(generation)) return;
      const fields = spotifyPlaybackFields(payload?.data);
      spotifySeekAudit("SpotifyProvider", "PLAYBACK_STARTED", {
        position: fields.positionSeconds,
        duration: fields.durationSeconds,
        paused: fields.isPaused,
        trackId: payload?.data?.uri ?? payload?.data?.track_uri ?? null,
        raw: payload?.data ?? null,
      });
      this.patch({
        isPlaying: true,
        isLoading: fields.isBuffering === true,
        error: null,
        ...(fields.positionSeconds !== null ? { currentTime: fields.positionSeconds } : {}),
        ...(fields.durationSeconds !== null ? { duration: fields.durationSeconds } : {}),
      }, "playback_started");
    };

    this.onUpdate = (payload) => {
      if (this.isStale(generation)) return;
      const raw = payload?.data ?? {};
      spotifySeekAuditRecordPlaybackUpdate(raw as Record<string, unknown>);
      const fields = spotifyPlaybackFields(payload?.data);
      spotifySeekAudit("SpotifyProvider", "PLAYBACK_UPDATE", {
        position: fields.positionSeconds,
        positionMsRaw: raw.position,
        duration: fields.durationSeconds,
        durationMsRaw: raw.duration,
        paused: fields.isPaused,
        buffering: fields.isBuffering,
        playingURI: raw.playingURI ?? raw.uri ?? null,
        trackId: raw.uri ?? raw.track_uri ?? null,
        reason: raw.reason ?? raw.reasons ?? null,
        rawPayload: raw,
      });
      volumePipelineTrace({
        initiator: "provider-playback_update",
        fn: "SpotifyProvider.onUpdate",
        phase: "playback_update",
        providerKind: "spotify",
        providerOverwrote: false,
        note: "Spotify playback_update payload has no volume/mute fields",
        extra: {
          hasVolumeField: "volume" in raw,
          hasMutedField: "muted" in raw || "isMuted" in raw,
          rawKeys: Object.keys(raw),
        },
      });
      queuePipelineTrace({
        fn: "SpotifyProvider.onUpdate",
        phase: "playback_update",
        mscActiveTrack: this.activeRefId,
        note: String(raw.playingURI ?? raw.uri ?? ""),
        extra: { position: fields.positionSeconds, staleRisk: false },
      });
      const partial: Partial<ProviderState> = {};

      if (fields.isPaused !== null) {
        partial.isPlaying = !fields.isPaused;
        partial.isLoading = fields.isBuffering === true;
        playPausePipelineTrace({
          fn: "SpotifyProvider.onUpdate",
          phase: "playback_update",
          event: "playback_update",
          providerIsPlaying: partial.isPlaying,
          providerIsPaused: fields.isPaused,
          activeTrack: this.activeRefId,
          note: "isPaused field present — patching isPlaying",
          extra: {
            position: fields.positionSeconds,
            buffering: fields.isBuffering,
            playingURI: raw.playingURI ?? raw.uri ?? null,
          },
        });
      } else if (fields.isBuffering === true) {
        partial.isLoading = true;
      } else if (fields.isBuffering === false) {
        partial.isLoading = false;
      }

      if (fields.durationSeconds !== null) {
        partial.duration = fields.durationSeconds;
      }

      if (fields.positionSeconds !== null) {
        partial.currentTime = fields.positionSeconds;
      }

      if (Object.keys(partial).length > 0) {
        this.patch(partial, "playback_update");
      }
    };

    const sdkEvents = [
      "ready",
      "not_ready",
      "playback_error",
      "player_state_changed",
    ] as const;

    for (const event of sdkEvents) {
      controller.addListener(event, (payload) => {
        if (this.isStale(generation)) return;
        spotifySeekAudit("SpotifyProvider", "SDK_CALLBACK", {
          event,
          payload: payload?.data ?? payload ?? null,
        });
      });
    }

    controller.addListener("playback_started", this.onStarted);
    controller.addListener("playback_update", this.onUpdate);
  }

  private getLayoutNodes(): HTMLElement[] {
    if (!this.mountNode) return [];
    const nodes: HTMLElement[] = [this.mountNode];
    const canvas = this.mountNode.closest("[data-player-embed-host]") as HTMLElement | null;
    if (canvas && !nodes.includes(canvas)) nodes.push(canvas);
    const root = document.getElementById(ROOT_ID) as HTMLElement | null;
    if (root && !nodes.includes(root)) nodes.push(root);
    const audioMount = this.mountNode.closest(".playback-engine-mount") as HTMLElement | null;
    if (audioMount && !nodes.includes(audioMount)) nodes.push(audioMount);
    return nodes;
  }

  private applyEmbedSize(el: HTMLElement): void {
    el.style.width = `${EMBED_WIDTH}px`;
    el.style.height = `${EMBED_HEIGHT}px`;
    el.style.minWidth = `${EMBED_WIDTH}px`;
    el.style.minHeight = `${EMBED_HEIGHT}px`;
    el.style.maxWidth = `${EMBED_WIDTH}px`;
    el.style.maxHeight = `${EMBED_HEIGHT}px`;
    el.style.overflow = "visible";
  }

  /** Ensure Spotify mount ancestors are >= 352×152 and in-layout (not 1×1 / offscreen). */
  private ensureEmbedMountDimensions(): void {
    if (!this.mountNode) return;

    for (const node of this.getLayoutNodes()) {
      this.applyEmbedSize(node);
    }

    const audioMount = this.mountNode.closest(".playback-engine-mount") as HTMLElement | null;
    if (audioMount) {
      audioMount.style.position = "fixed";
      audioMount.style.left = "0";
      audioMount.style.bottom = "0";
      audioMount.style.right = "auto";
      audioMount.style.top = "auto";
      audioMount.style.opacity = "0";
      audioMount.style.pointerEvents = "none";
      audioMount.style.zIndex = "-1";
      audioMount.style.visibility = "visible";
      audioMount.style.display = "block";
    }

    const root = document.getElementById(ROOT_ID) as HTMLElement | null;
    if (root) {
      root.style.position = "relative";
      root.style.inset = "auto";
      root.style.left = "auto";
      root.style.top = "auto";
      root.style.right = "auto";
      root.style.bottom = "auto";
      root.style.pointerEvents = "none";
    }
  }

  private isMountLayoutValid(): boolean {
    if (!this.mountNode?.isConnected) return false;
    return this.getLayoutNodes().every(
      (node) => node.clientWidth >= EMBED_WIDTH && node.clientHeight >= EMBED_HEIGHT,
    );
  }

  private waitForValidMountLayout(): Promise<void> {
    return new Promise((resolve, reject) => {
      const started = Date.now();

      const tick = () => {
        if (!this.mountNode?.isConnected) {
          reject(new Error("SpotifyProvider: mount node disconnected"));
          return;
        }

        this.ensureEmbedMountDimensions();

        if (this.isMountLayoutValid()) {
          resolve();
          return;
        }

        if (Date.now() - started > MOUNT_LAYOUT_TIMEOUT_MS) {
          reject(new Error("Spotify embed mount layout not ready"));
          return;
        }

        requestAnimationFrame(tick);
      };

      this.ensureEmbedMountDimensions();
      if (this.isMountLayoutValid()) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    });
  }

  private async ensureController(): Promise<SpotifyEmbedController> {
    if (!this.mountNode?.isConnected) {
      throw new Error("SpotifyProvider.ensureController: mount node not connected");
    }

    const existing = this.host.getController();
    if (existing && this.host.isReady()) {
      return existing;
    }

    if (!this.mountPromise) {
      this.mountPromise = this.host.mount(this.mountNode, EMBED_WIDTH, EMBED_HEIGHT);
    }

    try {
      return await this.mountPromise;
    } catch (err) {
      this.mountPromise = null;
      throw err;
    }
  }

  private waitForEmbedReady(generation: number, controller: SpotifyEmbedController): Promise<void> {
    if (this.host.isEmbedReady()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const timer = setTimeout(() => {
        finish(() => reject(new Error("Spotify embed ready timeout")));
      }, EMBED_READY_TIMEOUT_MS);

      const pollId = setInterval(() => {
        if (this.isStale(generation)) {
          finish(() => reject(new Error("Spotify embed load superseded")));
          return;
        }
        if (this.host.isEmbedReady()) {
          finish(() => resolve());
        }
      }, 50);

      const onControllerReady = () => {
        if (this.isStale(generation)) {
          finish(() => reject(new Error("Spotify embed load superseded")));
          return;
        }
        if (this.host.isEmbedReady()) {
          finish(() => resolve());
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        clearInterval(pollId);
        controller.removeListener?.("ready", onControllerReady);
      };

      controller.addListener("ready", onControllerReady);
      onControllerReady();
    });
  }

  async load(request: ProviderPlayRequest): Promise<void> {
    if (!this.mountNode) {
      throw new Error("SpotifyProvider.load: not attached");
    }

    const generation = this.bumpGeneration();
    const uri = spotifyUriFromUrl(request.sourceUrl);
    if (!uri) {
      const message = "Invalid Spotify URL";
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
      throw new Error(message);
    }

    this.activeRefId = request.item.refId;
    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "load", refId: request.item.refId, uri });
    logProviderLoad(this.kind, request.item.refId, { uri });
    this.patch({ isLoading: true, isPlaying: false, error: null, currentTime: 0, duration: 0 });

    try {
      this.ensureEmbedMountDimensions();
      await this.waitForValidMountLayout();
      if (this.isStale(generation)) return;

      const controller = await this.ensureController();
      if (this.isStale(generation)) return;

      this.bindController(generation, controller);
      this.host.loadUri(uri);
      await this.waitForEmbedReady(generation, controller);
      if (this.isStale(generation)) return;

      this.readyGate.markReady();
      this.patch({ isLoading: false });
    } catch (err) {
      if (this.isStale(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async startPlayback(): Promise<void> {
    if (!this.isReady) {
      throw new Error("SpotifyProvider.startPlayback: provider not ready");
    }

    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "startPlayback", refId: this.activeRefId });
    logProviderPlay(this.kind, this.activeRefId ?? "");
    const controller = this.controller ?? this.host.getController();
    if (controller) {
      try {
        controller.play();
      } catch {
        this.host.playIfReady();
      }
      return;
    }
    this.host.playIfReady();
  }

  async play(request: ProviderPlayRequest): Promise<void> {
    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "play", refId: request.item.refId });
    await this.load(request);
    await this.waitUntilReady();
    await this.startPlayback();
  }

  pause(): void {
    if (!this.isReady) return;
    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "pause", refId: this.activeRefId });
    logProviderPause(this.kind);
    playPausePipelineTrace({
      fn: "SpotifyProvider.pause",
      phase: "ENTER",
      event: "pause",
      duplicateCommand: isDuplicateCommand("spotify-pause"),
      providerIsPlaying: this.state.isPlaying,
      activeTrack: this.activeRefId,
    });
    this.host.pauseIfReady();
    this.patch({ isPlaying: false, isLoading: false });
    playPausePipelineTrace({
      fn: "SpotifyProvider.pause",
      phase: "EXIT",
      event: "pause",
      providerIsPlaying: this.state.isPlaying,
      activeTrack: this.activeRefId,
    });
  }

  resume(): void {
    if (!this.isReady) return;
    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "resume", refId: this.activeRefId });
    logProviderPlay(this.kind, this.activeRefId ?? "");
    playPausePipelineTrace({
      fn: "SpotifyProvider.resume",
      phase: "ENTER",
      event: "resume",
      duplicateCommand: isDuplicateCommand("spotify-resume"),
      providerIsPlaying: this.state.isPlaying,
      activeTrack: this.activeRefId,
    });
    this.patch({ isLoading: true, error: null });
    this.host.resumeIfReady();
    playPausePipelineTrace({
      fn: "SpotifyProvider.resume",
      phase: "EXIT",
      event: "resume",
      providerIsPlaying: this.state.isPlaying,
      activeTrack: this.activeRefId,
    });
  }

  stop(): void {
    spotifySeekAudit("SpotifyProvider", "COMMAND", { command: "stop", refId: this.activeRefId });
    this.bumpGeneration();
    this.clearListeners();
    this.host.pauseIfReady();
    this.controller = null;
    this.activeRefId = null;
    this.state = { ...EMPTY_PROVIDER_STATE };
    this.listener?.(this.getState());
  }

  seek(positionSeconds: number): void {
    const before = {
      position: this.state.currentTime,
      duration: this.state.duration,
      paused: !this.state.isPlaying,
      isReady: this.isReady,
      embedReady: this.host.isEmbedReady(),
      controllerReady: this.host.isReady(),
    };
    seekPipelineTrace("SpotifyProvider.seek", "ENTER", {
      positionSeconds,
      isReady: this.isReady,
      embedReady: this.host.isEmbedReady(),
      stateDuration: this.state.duration,
      stateCurrentTime: this.state.currentTime,
    });
    spotifySeekAudit("SpotifyProvider", "SEEK", {
      phase: "before",
      before,
      requestedSeconds: positionSeconds,
    });
    if (!this.isReady || !this.host.isEmbedReady()) {
      seekPipelineTrace("SpotifyProvider.seek", "EARLY_RETURN", {
        reason: "!isReady || !host.isEmbedReady()",
        isReady: this.isReady,
        embedReady: this.host.isEmbedReady(),
      });
      spotifySeekAudit("SpotifyProvider", "SEEK", {
        phase: "early_return",
        reason: "!isReady || !host.isEmbedReady()",
        before,
        requestedSeconds: positionSeconds,
      });
      playbackDebugWarn("PROVIDER", "spotify seek skipped — provider not ready");
      return;
    }
    const target = clampPlaybackPosition(positionSeconds, this.state.duration);
    const seekSeconds = Math.max(0, Math.round(target));
    const lastSdk = spotifySeekAuditLastPlaybackUpdate();
    spotifySeekAuditMarkSeek(Math.round(target * 1000));
    spotifySeekAudit("SpotifyProvider", "SEEK", {
      phase: "contract_check",
      before,
      requestedSeconds: target,
      passedToControllerSeek: seekSeconds,
      iframeApiContract: "EmbedController.seek(seconds) integer seconds",
      lastPlaybackUpdateBeforeSeek: lastSdk.raw,
      lastPlaybackUpdateMsAgo: lastSdk.at
        ? (typeof performance !== "undefined" ? performance.now() : Date.now()) - lastSdk.at
        : null,
    });
    this.patch({ currentTime: target }, "seek_optimistic_patch");
    seekPipelineTrace("SpotifyProvider.seek", "INVOKE", {
      next: "host.seekIfReady",
      targetSeconds: seekSeconds,
    });
    this.host.seekIfReady(seekSeconds);
    const afterImmediate = {
      position: this.state.currentTime,
      duration: this.state.duration,
      paused: !this.state.isPlaying,
    };
    spotifySeekAudit("SpotifyProvider", "SEEK", {
      phase: "after_immediate",
      before,
      requestedSeconds: target,
      passedToControllerSeek: seekSeconds,
      afterImmediate,
    });
    seekPipelineTrace("SpotifyProvider.seek", "EXIT", { target });
  }

  getState(): ProviderState {
    return { ...this.state };
  }

  destroy(): void {
    this.stop();
    this.clearListeners();
    this.host.destroy();
    this.mountNode = null;
    this.mountPromise = null;
    this.listener = null;
    this.readyGate.reset();
  }
}
