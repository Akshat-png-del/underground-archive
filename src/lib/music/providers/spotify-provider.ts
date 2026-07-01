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
import {
  clampPlaybackPosition,
  shouldAcceptPositionAfterSeek,
  spotifyPlaybackFields,
} from "@/lib/music/audio-transport-sync";

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
  private pendingSeekSeconds: number | null = null;
  private pendingSeekDeadline = 0;
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

  private patch(partial: Partial<ProviderState>): void {
    this.state = { ...this.state, ...partial };
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
      this.patch({
        isPlaying: true,
        isLoading: fields.isBuffering === true,
        error: null,
        ...(fields.positionSeconds !== null ? { currentTime: fields.positionSeconds } : {}),
        ...(fields.durationSeconds !== null ? { duration: fields.durationSeconds } : {}),
      });
    };

    this.onUpdate = (payload) => {
      if (this.isStale(generation)) return;
      const fields = spotifyPlaybackFields(payload?.data);
      const partial: Partial<ProviderState> = {};

      if (fields.isPaused !== null) {
        partial.isPlaying = !fields.isPaused;
        partial.isLoading = fields.isBuffering === true;
      } else if (fields.isBuffering === true) {
        partial.isLoading = true;
      } else if (fields.isBuffering === false) {
        partial.isLoading = false;
      }

      if (fields.durationSeconds !== null) {
        partial.duration = fields.durationSeconds;
      }

      if (fields.positionSeconds !== null) {
        const { accept, clearPending } = shouldAcceptPositionAfterSeek(
          fields.positionSeconds,
          this.pendingSeekSeconds,
          this.pendingSeekDeadline,
        );
        if (clearPending) {
          this.pendingSeekSeconds = null;
        }
        if (accept) {
          partial.currentTime = fields.positionSeconds;
        }
      }

      if (Object.keys(partial).length > 0) {
        this.patch(partial);
      }
    };

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
      const timer = setTimeout(() => {
        controller.removeListener?.("ready", onControllerReady);
        reject(new Error("Spotify embed ready timeout"));
      }, EMBED_READY_TIMEOUT_MS);

      const onControllerReady = () => {
        if (this.isStale(generation)) return;
        clearTimeout(timer);
        controller.removeListener?.("ready", onControllerReady);
        resolve();
      };

      controller.addListener("ready", onControllerReady);
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

    logProviderPlay(this.kind, this.activeRefId ?? undefined);
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
    await this.load(request);
    await this.waitUntilReady();
    await this.startPlayback();
  }

  pause(): void {
    if (!this.isReady) return;
    logProviderPause(this.kind);
    this.host.pauseIfReady();
    this.patch({ isPlaying: false, isLoading: false });
  }

  resume(): void {
    if (!this.isReady) return;
    logProviderPlay(this.kind);
    this.patch({ isLoading: true, isPlaying: false, error: null });
    this.host.resumeIfReady();
  }

  stop(): void {
    this.bumpGeneration();
    this.clearListeners();
    this.host.pauseIfReady();
    this.controller = null;
    this.pendingSeekSeconds = null;
    this.activeRefId = null;
    this.state = { ...EMPTY_PROVIDER_STATE };
    this.listener?.(this.getState());
  }

  seek(positionSeconds: number): void {
    if (!this.isReady || !this.host.isEmbedReady()) {
      playbackDebugWarn("PROVIDER", "spotify seek skipped — provider not ready");
      return;
    }
    const target = clampPlaybackPosition(positionSeconds, this.state.duration);
    this.pendingSeekSeconds = target;
    this.pendingSeekDeadline = Date.now() + 3000;
    this.patch({ currentTime: target, isLoading: true });
    this.host.seekIfReady(Math.round(target * 1000));
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
