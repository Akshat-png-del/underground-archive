import { createYouTubePlayer, type YouTubeEmbedPlayer } from "@/lib/music/youtube-embed-api";
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
import { logPlaybackStarted, logSeekExecuted, logVideoLoaded } from "@/lib/music/media-binding-debug";
import { extractYouTubeId } from "@/lib/music";

const EMBED_WIDTH = 352;
const EMBED_HEIGHT = 152;

export class YouTubeProvider implements PlaybackProvider {
  readonly kind = "youtube" as const;

  private mountNode: HTMLElement | null = null;
  private host: HTMLDivElement | null = null;
  private player: YouTubeEmbedPlayer | null = null;
  private listener: ProviderStateListener | null = null;
  private generation = 0;
  private activeGeneration = 0;
  private state: ProviderState = { ...EMPTY_PROVIDER_STATE };
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private videoId: string | null = null;
  private activeRefId: string | null = null;
  private readonly readyGate = new ProviderReadyGate();

  get isReady(): boolean {
    return this.readyGate.isReady;
  }

  attach(domNode: HTMLElement): void {
    if (!domNode.isConnected) {
      throw new Error("YouTubeProvider.attach: DOM node is not connected");
    }
    this.mountNode = domNode;
  }

  async init(): Promise<void> {
    if (!this.mountNode?.isConnected) {
      throw new Error("YouTubeProvider.init: provider not attached");
    }
    logProviderInit("youtube");
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

  private clearTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private startTick(): void {
    this.clearTick();
    this.tickTimer = setInterval(() => {
      if (!this.player || !this.state.isPlaying) return;
      try {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        this.state = {
          ...this.state,
          currentTime: Number.isFinite(currentTime) ? currentTime : this.state.currentTime,
          duration: Number.isFinite(duration) && duration > 0 ? duration : this.state.duration,
        };
        this.listener?.(this.getState());
      } catch {
        // player may be destroyed
      }
    }, 500);
    if (typeof this.tickTimer === "object" && this.tickTimer && "unref" in this.tickTimer) {
      this.tickTimer.unref();
    }
  }

  private ensureHost(): HTMLDivElement {
    if (!this.mountNode) {
      throw new Error("YouTubeProvider.ensureHost: not attached");
    }
    if (this.host?.isConnected) return this.host;
    if (this.host) this.host.remove();
    this.host = document.createElement("div");
    this.host.setAttribute("data-youtube-embed-host", "true");
    this.host.style.width = `${EMBED_WIDTH}px`;
    this.host.style.height = `${EMBED_HEIGHT}px`;
    this.mountNode.appendChild(this.host);
    return this.host;
  }

  private destroyPlayer(): void {
    this.clearTick();
    try {
      this.player?.destroy();
    } catch {
      // ignore
    }
    this.player = null;
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }

  async load(request: ProviderPlayRequest): Promise<void> {
    if (!this.mountNode) {
      throw new Error("YouTubeProvider.load: not attached");
    }

    const generation = this.bumpGeneration();
    this.destroyPlayer();

    const videoId =
      request.videoId ??
      extractYouTubeId(request.sourceUrl) ??
      extractYouTubeId(request.item.youtubeUrl ?? undefined) ??
      extractYouTubeId(request.item.youtubeId ?? undefined);

    if (!videoId) {
      const message = "Missing YouTube video ID";
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
      throw new Error(message);
    }

    this.videoId = videoId;
    this.activeRefId = request.item.refId;
    logProviderLoad(this.kind, request.item.refId, { videoId });
    this.patch({ isLoading: true, isPlaying: false, error: null, currentTime: 0, duration: 0 });

    const host = this.ensureHost();
    const refId = request.item.refId;

    try {
      const player = await createYouTubePlayer(host, videoId, EMBED_WIDTH, EMBED_HEIGHT, {
        onStateChange: (event) => {
          if (this.isStale(generation)) return;
          const YT = typeof window !== "undefined" ? window.YT : undefined;
          const playing = event.data === YT?.PlayerState?.PLAYING;
          const buffering = event.data === YT?.PlayerState?.BUFFERING;
          const paused = event.data === YT?.PlayerState?.PAUSED;
          const ended = event.data === YT?.PlayerState?.ENDED;
          if (playing) {
            logPlaybackStarted(this.kind, refId);
            this.patch({ isPlaying: true, isLoading: false, error: null });
            this.startTick();
          } else if (buffering) {
            this.patch({ isLoading: true });
          } else if (paused) {
            this.patch({ isPlaying: false, isLoading: false });
            this.clearTick();
            this.syncFromPlayer();
          } else if (ended) {
            this.patch({ isPlaying: false, isLoading: false, currentTime: 0 });
            this.clearTick();
          }
        },
        onError: () => {
          if (this.isStale(generation)) return;
          const message = "YouTube playback error";
          this.patch({ isPlaying: false, isLoading: false, error: message });
          this.readyGate.fail(message);
        },
      });

      if (this.isStale(generation)) {
        try {
          player.destroy();
        } catch {
          // ignore
        }
        return;
      }

      this.player = player;
      logVideoLoaded(videoId, refId);
      this.readyGate.markReady();
    } catch (err) {
      if (this.isStale(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async startPlayback(): Promise<void> {
    if (!this.isReady || !this.player) {
      throw new Error("YouTubeProvider.startPlayback: provider not ready");
    }

    logProviderPlay(this.kind, this.activeRefId ?? undefined);
    this.player.playVideo();
    this.syncFromPlayer();
    this.startTick();
  }

  async play(request: ProviderPlayRequest): Promise<void> {
    await this.load(request);
    await this.waitUntilReady();
    await this.startPlayback();
  }

  private syncFromPlayer(): void {
    if (!this.player) return;
    try {
      const currentTime = this.player.getCurrentTime();
      const duration = this.player.getDuration();
      this.patch({
        currentTime: Number.isFinite(currentTime) ? currentTime : 0,
        duration: Number.isFinite(duration) && duration > 0 ? duration : this.state.duration,
      });
    } catch {
      // ignore
    }
  }

  pause(): void {
    if (!this.isReady) return;
    logProviderPause(this.kind);
    try {
      this.player?.pauseVideo();
    } catch {
      // ignore
    }
    this.clearTick();
    this.syncFromPlayer();
    this.patch({ isPlaying: false, isLoading: false });
  }

  resume(): void {
    if (!this.isReady) return;
    logProviderPlay(this.kind);
    this.patch({ isLoading: true, isPlaying: false, error: null });
    try {
      this.player?.playVideo();
    } catch {
      // ignore
    }
  }

  stop(): void {
    this.bumpGeneration();
    try {
      this.player?.stopVideo();
    } catch {
      // ignore
    }
    this.destroyPlayer();
    this.videoId = null;
    this.activeRefId = null;
    this.state = { ...EMPTY_PROVIDER_STATE };
    this.listener?.(this.getState());
  }

  seek(positionSeconds: number): void {
    if (!this.isReady || !this.player) return;
    const clamped = Math.max(0, positionSeconds);
    try {
      this.player.seekTo(clamped, true);
      logSeekExecuted(clamped, this.kind);
      this.patch({ isLoading: true });
    } catch {
      // ignore
    }
  }

  getState(): ProviderState {
    if (this.player) {
      try {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        return {
          ...this.state,
          currentTime: Number.isFinite(currentTime) ? currentTime : this.state.currentTime,
          duration: Number.isFinite(duration) && duration > 0 ? duration : this.state.duration,
        };
      } catch {
        return { ...this.state };
      }
    }
    return { ...this.state };
  }

  destroy(): void {
    this.stop();
    this.mountNode = null;
    this.listener = null;
    this.readyGate.reset();
  }
}
