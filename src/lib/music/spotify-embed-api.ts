import { playbackDebugLog, playbackDebugError, playbackDebugWarn } from "@/lib/music/playback-debug";

const SPOTIFY_IFRAME_API = "https://open.spotify.com/embed/iframe-api/v1";
const SCRIPT_ID = "vitalforge-spotify-iframe-api";
const LOAD_TIMEOUT_MS = 15000;

export class SpotifyIframeApiError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = "SpotifyIframeApiError";
    this.retryable = retryable;
  }
}

export function isSpotifyIframeApiError(err: unknown): err is SpotifyIframeApiError {
  return err instanceof SpotifyIframeApiError;
}

export interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(positionMs: number): void;
  destroy(): void;
  addListener(event: string, callback: (payload?: { data?: Record<string, unknown> }) => void): void;
  removeListener?(event: string, callback: (payload?: { data?: Record<string, unknown> }) => void): void;
}

interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: { uri?: string; width?: number; height?: number },
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  }
}

type WindowWithSpotify = Window & {
  __vitalforgeSpotifyIframeApi?: SpotifyIFrameAPI;
  __vitalforgeSpotifyApiWaiters?: Array<{
    resolve: (api: SpotifyIFrameAPI) => void;
    reject: (err: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>;
  __vitalforgeSpotifyHookInstalled?: boolean;
};

let apiPromise: Promise<SpotifyIFrameAPI> | null = null;

function spotifyWindow(): WindowWithSpotify {
  return window as WindowWithSpotify;
}

function getWaiters(w: WindowWithSpotify) {
  if (!w.__vitalforgeSpotifyApiWaiters) w.__vitalforgeSpotifyApiWaiters = [];
  return w.__vitalforgeSpotifyApiWaiters;
}

function clearWaiter(waiter: { timeoutId: ReturnType<typeof setTimeout> }): void {
  clearTimeout(waiter.timeoutId);
}

function resolveApi(w: WindowWithSpotify, api: SpotifyIFrameAPI): void {
  w.__vitalforgeSpotifyIframeApi = api;
  playbackDebugLog("MOUNT", "Spotify IFrame API ready");
  const waiters = getWaiters(w);
  w.__vitalforgeSpotifyApiWaiters = [];
  for (const waiter of waiters) {
    clearWaiter(waiter);
    waiter.resolve(api);
  }
}

function rejectApi(w: WindowWithSpotify, err: Error): void {
  apiPromise = null;
  const waiters = getWaiters(w);
  w.__vitalforgeSpotifyApiWaiters = [];
  for (const waiter of waiters) {
    clearWaiter(waiter);
    waiter.reject(err);
  }
}

/** Spotify requires this global before the script executes — install once at module load. */
function ensureSpotifyReadyHook(w: WindowWithSpotify): void {
  if (w.__vitalforgeSpotifyHookInstalled) return;
  w.__vitalforgeSpotifyHookInstalled = true;

  const previous = w.onSpotifyIframeApiReady;
  w.onSpotifyIframeApiReady = (api) => {
    try {
      previous?.(api);
    } catch {
      // Never block our loader on third-party handlers.
    }
    resolveApi(w, api);
  };
}

if (typeof window !== "undefined") {
  ensureSpotifyReadyHook(spotifyWindow());
}

function removeSpotifyScriptTags(): void {
  document.getElementById(SCRIPT_ID)?.remove();
  for (const node of document.querySelectorAll(`script[src="${SPOTIFY_IFRAME_API}"]`)) {
    node.remove();
  }
}

function injectSpotifyScript(w: WindowWithSpotify): void {
  ensureSpotifyReadyHook(w);
  if (w.__vitalforgeSpotifyIframeApi) return;

  removeSpotifyScriptTags();

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SPOTIFY_IFRAME_API;
  script.async = true;
  script.onerror = () => {
    script.remove();
    playbackDebugError("SPOTIFY", "IFrame API script failed to load");
    rejectApi(w, new SpotifyIframeApiError("Failed to load Spotify IFrame API"));
  };

  const parent = document.head ?? document.body;
  parent.appendChild(script);
  playbackDebugLog("MOUNT", "Spotify IFrame API script injected");
}

function loadSpotifyIframeApi(allowRetry = true): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new SpotifyIframeApiError("Spotify IFrame API requires a browser", false),
    );
  }

  const w = spotifyWindow();
  if (w.__vitalforgeSpotifyIframeApi) {
    return Promise.resolve(w.__vitalforgeSpotifyIframeApi);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
    ensureSpotifyReadyHook(w);

    const timeoutId = setTimeout(() => {
      playbackDebugWarn("SPOTIFY", "IFrame API load timed out", { allowRetry });
      const waiters = getWaiters(w);
      w.__vitalforgeSpotifyApiWaiters = waiters.filter((waiter) => {
        if (waiter.resolve === resolve) {
          clearWaiter(waiter);
          return false;
        }
        return true;
      });
      apiPromise = null;
      removeSpotifyScriptTags();

      if (allowRetry) {
        loadSpotifyIframeApi(false).then(resolve).catch(reject);
        return;
      }
      reject(new SpotifyIframeApiError("Spotify IFrame API load timed out"));
    }, LOAD_TIMEOUT_MS);

    getWaiters(w).push({
      resolve: (api) => {
        clearTimeout(timeoutId);
        resolve(api);
      },
      reject: (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
      timeoutId,
    });

    injectSpotifyScript(w);
  }).catch((err) => {
    apiPromise = null;
    throw err;
  });

  return apiPromise;
}

export function preloadSpotifyIframeApi(): void {
  void loadSpotifyIframeApi().catch((err) => {
    playbackDebugError("SPOTIFY", "preload failed", err);
  });
}

export function spotifyUriFromUrl(url: string): string | null {
  const track = url.match(/\/track\/([a-zA-Z0-9]{22})/);
  if (track) return `spotify:track:${track[1]}`;
  const album = url.match(/\/album\/([a-zA-Z0-9]{22})/);
  if (album) return `spotify:album:${album[1]}`;
  const artist = url.match(/\/artist\/([a-zA-Z0-9]{22})/);
  if (artist) return `spotify:artist:${artist[1]}`;
  return null;
}

export class SpotifyEmbedHost {
  private host: HTMLDivElement | null = null;
  private controller: SpotifyEmbedController | null = null;
  /** Controller object exists (createController callback fired). */
  private controllerReady = false;
  /** Inner embed iframe finished loading (controller "ready" event). */
  private embedReady = false;
  private initPromise: Promise<SpotifyEmbedController> | null = null;
  private destroyed = false;

  private bindController(controller: SpotifyEmbedController): void {
    this.controller = controller;
    this.controllerReady = true;
    this.embedReady = false;
    controller.addListener("ready", () => {
      this.embedReady = true;
      playbackDebugLog("SPOTIFY", "embed iframe ready");
    });
  }

  /** Embed iframe is loaded — safe to postMessage play/pause/seek. */
  isEmbedReady(): boolean {
    return this.embedReady && !!this.controller;
  }

  pauseIfReady(): void {
    if (!this.isEmbedReady() || !this.controller) return;
    try {
      this.controller.pause();
    } catch {
      // Spotify may reject postMessage while iframe is still loading.
    }
  }

  resumeIfReady(): void {
    if (!this.isEmbedReady() || !this.controller) return;
    try {
      this.controller.resume();
    } catch {
      // ignore
    }
  }

  playIfReady(): void {
    if (!this.isEmbedReady() || !this.controller) return;
    try {
      this.controller.play();
    } catch {
      // ignore
    }
  }

  seekIfReady(positionMs: number): void {
    if (!this.isEmbedReady() || !this.controller) return;
    try {
      this.controller.seek(positionMs);
    } catch {
      // ignore
    }
  }

  loadUri(uri: string): void {
    if (!this.controller) return;
    this.embedReady = false;
    try {
      this.controller.loadUri(uri);
    } catch {
      // ignore
    }
  }

  mount(container: HTMLElement, width: number, height: number): Promise<SpotifyEmbedController> {
    this.destroyed = false;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const api = await loadSpotifyIframeApi();

      if (this.destroyed) {
        playbackDebugWarn("SPOTIFY", "mount aborted — host was destroyed during API load");
        throw new SpotifyIframeApiError("Spotify embed host destroyed before mount completed", false);
      }

      if (!this.host) {
        this.host = document.createElement("div");
        this.host.setAttribute("data-spotify-embed-host", "true");
        this.host.style.width = `${width}px`;
        this.host.style.height = `${height}px`;
        container.appendChild(this.host);
      }

      if (this.controller) return this.controller;

      return new Promise<SpotifyEmbedController>((resolve, reject) => {
        try {
          api.createController(
            this.host!,
            { width, height },
            (controller) => {
              if (this.destroyed) {
                try {
                  controller.destroy();
                } catch {
                  // ignore stale controller teardown
                }
                reject(new SpotifyIframeApiError("Spotify embed host destroyed during controller create", false));
                return;
              }
              this.bindController(controller);
              playbackDebugLog("MOUNT", "Spotify embed controller created");
              resolve(controller);
            },
          );
        } catch (err) {
          reject(err);
        }
      });
    })();

    return this.initPromise.catch((err) => {
      if (this.destroyed) {
        this.initPromise = null;
      }
      throw err;
    });
  }

  isReady(): boolean {
    return this.controllerReady && !!this.controller;
  }

  getController(): SpotifyEmbedController | null {
    return this.controller;
  }

  destroy(): void {
    this.destroyed = true;
    try {
      if (this.isEmbedReady()) {
        this.controller?.destroy();
      }
    } catch {
      // ignore teardown errors
    }
    this.controller = null;
    this.controllerReady = false;
    this.embedReady = false;
    this.initPromise = null;
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }
}

export async function playSpotifyUri(
  host: SpotifyEmbedHost,
  container: HTMLElement,
  uri: string,
  width: number,
  height: number,
): Promise<SpotifyEmbedController> {
  const controller = await host.mount(container, width, height);
  playbackDebugLog("SPOTIFY", "loadUri + play()", { uri });
  host.loadUri(uri);
  if (host.isEmbedReady()) {
    host.playIfReady();
  } else {
    const onReady = () => {
      controller.removeListener?.("ready", onReady);
      host.playIfReady();
    };
    controller.addListener("ready", onReady);
  }
  return controller;
}
