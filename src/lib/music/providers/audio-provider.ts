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

export class AudioProvider implements PlaybackProvider {
  readonly kind = "audio" as const;

  private mountNode: HTMLElement | null = null;
  private audio: HTMLAudioElement | null = null;
  private listener: ProviderStateListener | null = null;
  private generation = 0;
  private activeGeneration = 0;
  private state: ProviderState = { ...EMPTY_PROVIDER_STATE };
  private readonly readyGate = new ProviderReadyGate();
  private volume = 1;
  private muted = false;

  constructor(volume = 1, muted = false) {
    this.volume = volume;
    this.muted = muted;
  }

  get isReady(): boolean {
    return this.readyGate.isReady;
  }

  attach(domNode: HTMLElement): void {
    if (!domNode.isConnected) {
      throw new Error("AudioProvider.attach: DOM node is not connected");
    }
    this.mountNode = domNode;
  }

  async init(): Promise<void> {
    if (!this.mountNode?.isConnected) {
      throw new Error("AudioProvider.init: provider not attached");
    }
    if (this.audio) return;

    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.volume = this.volume;
    audio.muted = this.muted;
    audio.style.display = "none";
    this.mountNode.appendChild(audio);
    this.audio = audio;
    this.bindEvents();
    logProviderInit("audio");
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

  private syncDurationFromElement(): void {
    if (!this.audio) return;
    const dur = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    if (dur > 0) {
      this.patch({ duration: dur });
    }
  }

  private bindEvents(): void {
    if (!this.audio) return;
    const audio = this.audio;

    const emit = () => this.pushState();

    audio.addEventListener("play", () => {
      this.patch({ isPlaying: true, isLoading: false, error: null });
      emit();
    });
    audio.addEventListener("playing", () => {
      this.patch({ isPlaying: true, isLoading: false, error: null });
      emit();
    });
    audio.addEventListener("pause", () => {
      this.patch({ isPlaying: false, isLoading: false });
      emit();
    });
    audio.addEventListener("ended", () => {
      this.patch({ isPlaying: false, isLoading: false, currentTime: 0 });
    });
    audio.addEventListener("waiting", () => {
      this.patch({ isLoading: true });
    });
    audio.addEventListener("canplay", () => {
      this.patch({ isLoading: false });
      this.syncDurationFromElement();
      emit();
    });
    audio.addEventListener("loadedmetadata", () => {
      this.syncDurationFromElement();
    });
    audio.addEventListener("durationchange", () => {
      this.syncDurationFromElement();
    });
    audio.addEventListener("loadeddata", () => {
      this.syncDurationFromElement();
      emit();
    });
    audio.addEventListener("timeupdate", emit);
    audio.addEventListener("seeking", () => {
      this.patch({ isLoading: true });
      emit();
    });
    audio.addEventListener("seeked", () => {
      this.patch({ isLoading: false, currentTime: this.audio?.currentTime ?? this.state.currentTime });
      this.pushState();
    });
    audio.addEventListener("error", () => {
      const mediaError = audio.error;
      const message =
        mediaError?.message || `Audio error (code ${mediaError?.code ?? "unknown"})`;
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
    });
  }

  private patch(partial: Partial<ProviderState>): void {
    this.state = { ...this.state, ...partial };
    this.listener?.(this.getState());
  }

  private pushState(): void {
    if (!this.audio || this.generation !== this.activeGeneration) return;
    this.state = {
      ...this.state,
      currentTime: this.audio.currentTime,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : this.state.duration,
    };
    this.listener?.(this.getState());
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

  async load(request: ProviderPlayRequest): Promise<void> {
    if (!this.audio) {
      throw new Error("AudioProvider.load: not initialized");
    }

    const generation = this.bumpGeneration();
    logProviderLoad(this.kind, request.item.refId, { sourceUrl: request.sourceUrl });
    this.patch({ isLoading: true, isPlaying: false, error: null, currentTime: 0, duration: 0 });
    this.audio.volume = this.volume;
    this.audio.muted = this.muted;

    await new Promise<void>((resolve, reject) => {
      const audio = this.audio!;
      const onCanPlay = () => {
        cleanup();
        if (this.isStale(generation)) {
          reject(new Error("AudioProvider.load: stale generation"));
          return;
        }
        this.readyGate.markReady();
        resolve();
      };
      const onError = () => {
        cleanup();
        if (this.isStale(generation)) return;
        const mediaError = audio.error;
        const message =
          mediaError?.message || `Audio error (code ${mediaError?.code ?? "unknown"})`;
        this.readyGate.fail(message);
        reject(new Error(message));
      };
      const cleanup = () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("canplay", onCanPlay);
      audio.addEventListener("error", onError);
      audio.src = request.sourceUrl;
      audio.load();
    });
  }

  async startPlayback(): Promise<void> {
    if (!this.isReady || !this.audio) {
      throw new Error("AudioProvider.startPlayback: provider not ready");
    }

    const generation = this.activeGeneration;
    logProviderPlay(this.kind);
    try {
      await this.audio.play();
      if (this.isStale(generation)) {
        this.audio.pause();
        return;
      }
      this.pushState();
    } catch (err) {
      if (this.isStale(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      this.patch({ isPlaying: false, isLoading: false, error: message });
      this.readyGate.fail(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async play(request: ProviderPlayRequest): Promise<void> {
    await this.load(request);
    await this.waitUntilReady();
    await this.startPlayback();
  }

  pause(): void {
    if (!this.audio) return;
    logProviderPause(this.kind);
    this.audio.pause();
    this.pushState();
  }

  resume(): void {
    if (!this.isReady || !this.audio) return;
    logProviderPlay(this.kind);
    this.patch({ isLoading: true, isPlaying: false });
    void this.audio.play().then(() => this.pushState()).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.patch({ isPlaying: false, isLoading: false, error: message });
    });
  }

  stop(): void {
    this.bumpGeneration();
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.removeAttribute("src");
        this.audio.load();
      } catch {
        // ignore
      }
    }
    this.state = { ...EMPTY_PROVIDER_STATE };
    this.listener?.(this.getState());
  }

  seek(positionSeconds: number): void {
    if (!this.audio?.src) return;
    const max = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const clamped = max > 0 ? Math.min(Math.max(0, positionSeconds), max) : Math.max(0, positionSeconds);
    this.audio.currentTime = clamped;
    this.patch({
      currentTime: Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : clamped,
      isLoading: true,
    });
    this.pushState();
  }

  getState(): ProviderState {
    if (!this.audio) return { ...this.state };
    return {
      ...this.state,
      currentTime: Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : this.state.currentTime,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : this.state.duration,
    };
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.audio) this.audio.volume = volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) this.audio.muted = muted;
  }

  destroy(): void {
    this.stop();
    this.audio?.remove();
    this.audio = null;
    this.mountNode = null;
    this.listener = null;
    this.readyGate.reset();
  }
}
