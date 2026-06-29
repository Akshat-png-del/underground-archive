import type { PlaybackItem } from "@/lib/music/playback";
import { buildPlaybackEmbedUrl } from "@/lib/music/playback";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import {
  playSpotifyUri,
  spotifyUriFromUrl,
  SpotifyEmbedHost,
  type SpotifyEmbedController,
} from "@/lib/music/spotify-embed-api";
import {
  playbackDebugLog,
  playbackDebugWarn,
  playbackDebugError,
  probePlaybackDom,
  probeEmbedAudibility,
} from "@/lib/music/playback-debug";

const BLANK_EMBED = "about:blank";
const ROOT_ID = "vitalforge-playback-root";
const EMBED_WIDTH = 352;
const EMBED_HEIGHT = 152;

function applyEmbedContainerStyles(container: HTMLDivElement): void {
  container.style.cssText = [
    "position:fixed",
    "left:0",
    "bottom:5.25rem",
    `width:${EMBED_WIDTH}px`,
    `height:${EMBED_HEIGHT}px`,
    "overflow:hidden",
    "pointer-events:none",
    "z-index:39",
    "border:0",
    "opacity:1",
    "visibility:visible",
    "display:block",
  ].join(";");
}

function assertPlaybackSingleton(): void {
  if (typeof document === "undefined") return;
  const roots = document.querySelectorAll(`#${ROOT_ID}`);
  if (roots.length > 1) {
    playbackDebugError("MOUNT", "[INVARIANT FAILED] multiple roots", { count: roots.length });
  }
  const root = document.getElementById(ROOT_ID);
  const iframes = root?.querySelectorAll("iframe") ?? [];
  if (iframes.length > 1) {
    playbackDebugError("MOUNT", "[INVARIANT FAILED] multiple iframes", { count: iframes.length });
  }
}

function logSpotifyAudibility(): void {
  const audibility = probeEmbedAudibility();
  const visible =
    !audibility.checks.displayNone &&
    !audibility.checks.visibilityHidden &&
    !audibility.checks.opacityZero &&
    !audibility.checks.tooSmall;
  playbackDebugLog("SPOTIFY", "iframe visible?", {
    visible,
    inViewport: audibility.inViewport,
    dimensions: audibility.iframeDimensions,
    containerStyles: audibility.containerStyles,
    iframeStyles: audibility.iframeStyles,
    containerRect: audibility.containerRect,
    iframeRect: audibility.iframeRect,
    parent: audibility.embedProvider,
  });
  if (audibility.audibilityRisk.length > 0) {
    playbackDebugWarn("SPOTIFY", "autoplay risk detected", audibility.audibilityRisk);
  }
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

type StateListener = (patch: Partial<PlayerEngineState>) => void;

class GlobalPlayerEngine {
  private container: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private audio: HTMLAudioElement | null = null;
  private spotifyHost = new SpotifyEmbedHost();
  private spotifyController: SpotifyEmbedController | null = null;
  private listener: StateListener | null = null;
  private mounted = false;

  private generation = 0;
  private activeGeneration = 0;
  private embedLoadGeneration = 0;

  private mode: PlayerEngineMode = "idle";
  private currentTrack: PlaybackItem | null = null;
  private lastEmbedUrl: string | null = null;
  private lastSpotifyUri: string | null = null;
  private isPlaying = false;
  private isLoading = false;
  private currentTime = 0;
  private duration = 0;
  private error: string | null = null;

  private onEmbedLoad: ((ev: Event) => void) | null = null;
  private onEmbedError: ((ev: Event) => void) | null = null;
  private onSpotifyPlaybackStarted: ((payload?: { data?: Record<string, unknown> }) => void) | null =
    null;
  private onSpotifyPlaybackUpdate: ((payload?: { data?: Record<string, unknown> }) => void) | null =
    null;

  setStateListener(listener: StateListener | null): void {
    this.listener = listener;
  }

  getGeneration(): number {
    return this.activeGeneration;
  }

  isEngineMounted(): boolean {
    return this.mounted && !!this.container?.isConnected;
  }

  private emit(patch: Partial<PlayerEngineState>): void {
    if (patch.mode !== undefined) this.mode = patch.mode;
    if (patch.currentTrack !== undefined) this.currentTrack = patch.currentTrack;
    if (patch.isPlaying !== undefined) this.isPlaying = patch.isPlaying;
    if (patch.isLoading !== undefined) this.isLoading = patch.isLoading;
    if (patch.currentTime !== undefined) this.currentTime = patch.currentTime;
    if (patch.duration !== undefined) this.duration = patch.duration;
    if (patch.error !== undefined) this.error = patch.error;

    this.listener?.({
      mode: this.mode,
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.currentTime,
      duration: this.duration,
      error: this.error,
    });
  }

  private bumpGeneration(): number {
    this.generation += 1;
    this.activeGeneration = this.generation;
    return this.activeGeneration;
  }

  private isStale(generation: number): boolean {
    return generation !== this.activeGeneration;
  }

  private clearEmbedListeners(): void {
    if (this.iframe && this.onEmbedLoad) {
      this.iframe.removeEventListener("load", this.onEmbedLoad);
    }
    if (this.iframe && this.onEmbedError) {
      this.iframe.removeEventListener("error", this.onEmbedError);
    }
    this.onEmbedLoad = null;
    this.onEmbedError = null;
  }

  private clearSpotifyListeners(): void {
    if (this.spotifyController && this.onSpotifyPlaybackStarted) {
      this.spotifyController.removeListener?.("playback_started", this.onSpotifyPlaybackStarted);
    }
    if (this.spotifyController && this.onSpotifyPlaybackUpdate) {
      this.spotifyController.removeListener?.("playback_update", this.onSpotifyPlaybackUpdate);
    }
    this.onSpotifyPlaybackStarted = null;
    this.onSpotifyPlaybackUpdate = null;
  }

  private destroyYoutubeIframe(): void {
    this.clearEmbedListeners();
    if (this.iframe) {
      try {
        this.iframe.src = BLANK_EMBED;
      } catch {
        // ignore
      }
      this.iframe.remove();
      this.iframe = null;
    }
  }

  private destroyAudioElement(): void {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    } catch {
      // ignore
    }
    this.audio.remove();
    this.audio = null;
  }

  /** Tear down active media — only one player instance at a time. */
  private destroyMediaElements(): void {
    playbackDebugLog("PLAYER", "destroying old embed");
    this.clearSpotifyListeners();
    this.spotifyHost.destroy();
    this.spotifyController = null;
    this.destroyYoutubeIframe();
    this.destroyAudioElement();
  }

  private ensureYoutubeIframe(): HTMLIFrameElement | null {
    if (!this.container) return null;
    if (this.iframe) return this.iframe;

    const iframe = document.createElement("iframe");
    iframe.title = "Global playback";
    iframe.allow =
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.setAttribute("tabindex", "-1");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = `border:0;width:${EMBED_WIDTH}px;height:${EMBED_HEIGHT}px;`;
    iframe.src = BLANK_EMBED;
    this.container.appendChild(iframe);
    this.iframe = iframe;
    return iframe;
  }

  private ensureAudioElement(): HTMLAudioElement | null {
    if (!this.container) return null;
    if (this.audio) return this.audio;

    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    this.bindAudioEvents(audio);
    this.container.appendChild(audio);
    this.audio = audio;
    return audio;
  }

  mount(): void {
    if (typeof document === "undefined") return;

    let container = document.getElementById(ROOT_ID) as HTMLDivElement | null;
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
    assertPlaybackSingleton();
    void this.spotifyHost.mount(container, EMBED_WIDTH, EMBED_HEIGHT).catch((err) => {
      playbackDebugError("SPOTIFY", "controller preload failed", err);
    });
    playbackDebugLog("MOUNT", "engine initialized", probePlaybackDom());
  }

  private bindAudioEvents(audio: HTMLAudioElement): void {
    audio.addEventListener("play", () => {
      if (this.mode !== "audio") return;
      playbackDebugLog("AUDIO", "html5 play event");
      this.emit({ isPlaying: true, isLoading: false, error: null });
    });

    audio.addEventListener("pause", () => {
      if (this.mode !== "audio") return;
      this.emit({ isPlaying: false, isLoading: false });
    });

    audio.addEventListener("ended", () => {
      if (this.mode !== "audio") return;
      this.emit({ isPlaying: false, isLoading: false, currentTime: 0 });
    });

    audio.addEventListener("error", () => {
      if (this.mode !== "audio") return;
      const mediaError = audio.error;
      const message =
        mediaError?.message || `Audio error (code ${mediaError?.code ?? "unknown"})`;
      playbackDebugError("ENGINE", `audio error — ${message}`, mediaError);
      this.emit({ isPlaying: false, isLoading: false, error: message });
    });

    audio.addEventListener("waiting", () => {
      if (this.mode !== "audio") return;
      this.emit({ isLoading: true });
    });

    audio.addEventListener("canplay", () => {
      if (this.mode !== "audio") return;
      this.emit({ isLoading: false });
    });

    audio.addEventListener("loadedmetadata", () => {
      if (this.mode !== "audio") return;
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      this.emit({ duration: dur });
    });

    audio.addEventListener("timeupdate", () => {
      if (this.mode !== "audio") return;
      this.emit({ currentTime: audio.currentTime });
    });
  }

  private bindYoutubeEmbedLoad(generation: number): void {
    if (!this.iframe) return;
    this.clearEmbedListeners();

    this.onEmbedLoad = () => {
      if (this.isStale(generation) || this.embedLoadGeneration !== generation) {
        playbackDebugWarn("RACE", "embed load ignored — stale generation", {
          generation,
          active: this.activeGeneration,
        });
        return;
      }
      if (this.mode !== "embed") return;

      const src = this.iframe?.src ?? "";
      if (!src || src === BLANK_EMBED || !src.includes("youtube.com/embed")) {
        playbackDebugLog("EMBED", "iframe load ignored — not YouTube embed", { src });
        return;
      }

      playbackDebugLog("AUDIO", "YouTube embed load complete — marking playing", {
        refId: this.currentTrack?.refId,
        src,
      });
      this.emit({ isPlaying: true, isLoading: false, error: null });
    };

    this.onEmbedError = () => {
      if (this.isStale(generation) || this.embedLoadGeneration !== generation) return;
      playbackDebugError("ENGINE", "embed load failed");
      this.emit({ isPlaying: false, isLoading: false, error: "Embed failed to load" });
    };

    this.iframe.addEventListener("load", this.onEmbedLoad);
    this.iframe.addEventListener("error", this.onEmbedError);
  }

  private bindSpotifyControllerEvents(generation: number, controller: SpotifyEmbedController): void {
    this.clearSpotifyListeners();
    this.spotifyController = controller;

    this.onSpotifyPlaybackStarted = () => {
      if (this.isStale(generation) || this.mode !== "spotify") return;
      playbackDebugLog("AUDIO", "Spotify playback_started — marking playing", {
        refId: this.currentTrack?.refId,
      });
      logSpotifyAudibility();
      this.emit({ isPlaying: true, isLoading: false, error: null });
    };

    this.onSpotifyPlaybackUpdate = (payload) => {
      if (this.isStale(generation) || this.mode !== "spotify") return;
      const paused = payload?.data?.isPaused;
      if (typeof paused === "boolean") {
        this.emit({ isPlaying: !paused, isLoading: false });
      }
    };

    controller.addListener("playback_started", this.onSpotifyPlaybackStarted);
    controller.addListener("playback_update", this.onSpotifyPlaybackUpdate);
  }

  private prepareForNewPlayback(item: PlaybackItem): number {
    if (this.currentTrack) {
      playbackDebugLog("PLAYER", "stopping old track", {
        from: this.currentTrack.refId,
        to: item.refId,
      });
    }

    const generation = this.bumpGeneration();
    this.destroyMediaElements();

    this.currentTime = 0;
    this.duration = 0;
    this.error = null;

    return generation;
  }

  play(item: PlaybackItem): void {
    if (!this.mounted) {
      playbackDebugWarn("MOUNT", "play requested before engine mount — mounting now");
    }
    this.mount();

    const generation = this.prepareForNewPlayback(item);

    playbackDebugLog("ENGINE", "play requested", {
      refId: item.refId,
      type: item.type,
      generation,
      engineMounted: this.isEngineMounted(),
    });

    const resolved = resolvePlaybackSource(item);
    const embedUrl = buildPlaybackEmbedUrl(item);
    const previewUrl = resolved.kind === "preview" ? resolved.sourceUrl : null;

    playbackDebugLog("SOURCE", "resolved", {
      kind: resolved.kind,
      sourceUrl: resolved.sourceUrl,
      embedUrl,
      previewUrl,
      issue: resolved.issue,
    });

    playbackDebugLog("PLAYER", "loading new source", {
      refId: item.refId,
      kind: resolved.kind,
    });

    this.currentTrack = item;

    this.emit({
      currentTrack: item,
      error: null,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      isPlaying: false,
    });

    if (previewUrl) {
      void this.startAudio(item, previewUrl, generation);
      return;
    }

    if (resolved.kind === "spotify" && resolved.sourceUrl) {
      if (this.startSpotifyEmbedSync(item, resolved.sourceUrl, generation)) {
        return;
      }
      void this.startSpotifyEmbedAsync(item, resolved.sourceUrl, generation);
      return;
    }

    if (embedUrl) {
      this.startYoutubeEmbed(item, embedUrl, generation);
      return;
    }

    const message = resolved.issue ?? `No playback source for "${item.title}"`;
    playbackDebugError("ENGINE", `play failed — ${message}`, item);
    this.emit({
      isPlaying: false,
      isLoading: false,
      error: message,
      mode: "idle",
    });
  }

  /** Synchronous path — preserves user activation for controller.play(). */
  private startSpotifyEmbedSync(
    item: PlaybackItem,
    sourceUrl: string,
    generation: number,
  ): boolean {
    if (!this.container || this.isStale(generation)) return true;

    const uri = spotifyUriFromUrl(sourceUrl);
    if (!uri) {
      playbackDebugError("SPOTIFY", "could not derive spotify: URI", { sourceUrl });
      this.emit({ isPlaying: false, isLoading: false, error: "Invalid Spotify URL" });
      return true;
    }

    const controller = this.spotifyHost.getController();
    if (!controller || !this.spotifyHost.isReady()) {
      playbackDebugWarn("MOUNT", "Spotify controller not ready — falling back to async play");
      return false;
    }

    this.mode = "spotify";
    this.lastSpotifyUri = uri;
    this.lastEmbedUrl = null;
    this.emit({
      mode: "spotify",
      currentTrack: item,
      isLoading: true,
      isPlaying: false,
      error: null,
    });

    this.bindSpotifyControllerEvents(generation, controller);
    playbackDebugLog("SPOTIFY", "loadUri + play() sync (user gesture preserved)", { uri });
    controller.loadUri(uri);
    try {
      controller.play();
      logSpotifyAudibility();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      playbackDebugError("SPOTIFY", `controller.play() failed — ${message}`, err);
      this.emit({ isPlaying: false, isLoading: false, error: message });
    }
    return true;
  }

  private async startSpotifyEmbedAsync(
    item: PlaybackItem,
    sourceUrl: string,
    generation: number,
  ): Promise<void> {
    if (!this.container || this.isStale(generation)) return;

    const uri = spotifyUriFromUrl(sourceUrl);
    if (!uri) {
      playbackDebugError("SPOTIFY", "could not derive spotify: URI", { sourceUrl });
      this.emit({ isPlaying: false, isLoading: false, error: "Invalid Spotify URL" });
      return;
    }

    this.mode = "spotify";
    this.lastSpotifyUri = uri;
    this.lastEmbedUrl = null;
    this.emit({
      mode: "spotify",
      currentTrack: item,
      isLoading: true,
      isPlaying: false,
      error: null,
    });

    try {
      const controller = await playSpotifyUri(
        this.spotifyHost,
        this.container,
        uri,
        EMBED_WIDTH,
        EMBED_HEIGHT,
      );

      if (this.isStale(generation)) return;

      this.bindSpotifyControllerEvents(generation, controller);
      logSpotifyAudibility();

      if (this.spotifyHost.isReady()) {
        playbackDebugLog("AUDIO", "Spotify controller.play() dispatched in gesture chain", {
          refId: item.refId,
          uri,
        });
      }
    } catch (err) {
      if (this.isStale(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      playbackDebugError("SPOTIFY", `playback failed — ${message}`, err);
      this.emit({ isPlaying: false, isLoading: false, error: message });
    }
  }

  private async startAudio(
    item: PlaybackItem,
    previewUrl: string,
    generation: number,
  ): Promise<void> {
    const audio = this.ensureAudioElement();
    if (!audio || this.isStale(generation)) return;

    this.mode = "audio";
    this.lastEmbedUrl = null;
    this.emit({ mode: "audio", isLoading: true, isPlaying: false });

    try {
      audio.src = previewUrl;
      audio.load();

      if (this.isStale(generation)) {
        audio.pause();
        return;
      }

      await audio.play();

      if (this.isStale(generation)) {
        audio.pause();
        return;
      }

      playbackDebugLog("AUDIO", "preview playback started", { refId: item.refId });
      this.emit({
        currentTrack: item,
        isPlaying: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (this.isStale(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      playbackDebugError("ENGINE", `play failed (audio) — ${message}`, err);
      this.emit({ isPlaying: false, isLoading: false, error: message });
    }
  }

  private startYoutubeEmbed(item: PlaybackItem, embedUrl: string, generation: number): void {
    const iframe = this.ensureYoutubeIframe();
    if (!iframe || this.isStale(generation)) return;

    this.mode = "embed";
    this.lastEmbedUrl = embedUrl;
    this.embedLoadGeneration = generation;

    this.emit({
      mode: "embed",
      currentTrack: item,
      isLoading: true,
      isPlaying: false,
      error: null,
    });

    this.bindYoutubeEmbedLoad(generation);
    playbackDebugLog("EMBED", "setting iframe.src", { to: embedUrl });
    iframe.src = embedUrl;
  }

  pause(): void {
    playbackDebugLog("ENGINE", "pause requested", { mode: this.mode, refId: this.currentTrack?.refId });

    if (this.mode === "audio" && this.audio) {
      this.audio.pause();
      this.emit({ isPlaying: false, isLoading: false });
      return;
    }

    if (this.mode === "spotify" && this.spotifyController) {
      this.spotifyController.pause();
      this.emit({ isPlaying: false, isLoading: false });
      return;
    }

    if (this.mode === "embed") {
      playbackDebugLog("PLAYER", "stopping old track", { reason: "pause", refId: this.currentTrack?.refId });
      this.bumpGeneration();
      this.destroyMediaElements();
      this.ensureYoutubeIframe();
      this.ensureAudioElement();
      this.emit({ isPlaying: false, isLoading: false });
    }
  }

  resume(): void {
    playbackDebugLog("ENGINE", "resume requested", {
      mode: this.mode,
      refId: this.currentTrack?.refId,
    });
    if (!this.currentTrack) return;

    if (this.mode === "audio" && this.audio?.src) {
      this.emit({ isLoading: true, isPlaying: false });
      void this.audio.play().then(() => {
        playbackDebugLog("AUDIO", "preview resumed", { refId: this.currentTrack?.refId });
        this.emit({ isPlaying: true, isLoading: false, error: null });
      }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        playbackDebugError("ENGINE", `resume failed (audio) — ${message}`, err);
        this.emit({ isPlaying: false, isLoading: false, error: message });
      });
      return;
    }

    if (this.mode === "spotify" && this.spotifyController) {
      this.emit({ isLoading: true, isPlaying: false, error: null });
      try {
        this.spotifyController.resume();
        playbackDebugLog("SPOTIFY", "controller.resume()");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        playbackDebugError("SPOTIFY", `resume failed — ${message}`, err);
        this.emit({ isPlaying: false, isLoading: false, error: message });
      }
      return;
    }

    if (this.mode === "embed" && this.lastEmbedUrl) {
      const generation = this.bumpGeneration();
      this.destroyYoutubeIframe();
      const iframe = this.ensureYoutubeIframe();
      this.embedLoadGeneration = generation;
      this.emit({ isLoading: true, isPlaying: false, error: null });
      if (iframe) {
        this.bindYoutubeEmbedLoad(generation);
        iframe.src = this.lastEmbedUrl;
      }
      return;
    }

    this.play(this.currentTrack);
  }

  stop(): void {
    playbackDebugLog("PLAYER", "stopping old track", { reason: "stop" });
    this.bumpGeneration();
    this.destroyMediaElements();
    this.mode = "idle";
    this.currentTrack = null;
    this.lastEmbedUrl = null;
    this.lastSpotifyUri = null;
    this.emit({
      mode: "idle",
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      error: null,
    });
  }

  seek(seconds: number): void {
    if (this.mode === "audio" && this.audio) {
      this.audio.currentTime = seconds;
      this.emit({ currentTime: seconds });
      return;
    }
    this.emit({ currentTime: seconds });
  }

  getSnapshot(): PlayerEngineState {
    return {
      mode: this.mode,
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.currentTime,
      duration: this.duration,
      error: this.error,
    };
  }
}

export const globalPlayerEngine = new GlobalPlayerEngine();

/** @internal Test-only: reset engine between stress-test runs. */
export function __resetGlobalPlayerEngineForTests(): void {
  globalPlayerEngine.stop();
}
