import { playbackDebugLog, playbackDebugError } from "@/lib/music/playback-debug";

const SPOTIFY_IFRAME_API = "https://open.spotify.com/embed/iframe-api/v1";

export interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
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

let apiPromise: Promise<SpotifyIFrameAPI> | null = null;

type WindowWithSpotify = Window & {
  __vitalforgeSpotifyIframeApi?: SpotifyIFrameAPI;
};

function loadSpotifyIframeApi(): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify IFrame API requires a browser"));
  }

  const w = window as WindowWithSpotify;
  if (w.__vitalforgeSpotifyIframeApi) {
    return Promise.resolve(w.__vitalforgeSpotifyIframeApi);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const finish = (api: SpotifyIFrameAPI) => {
      w.__vitalforgeSpotifyIframeApi = api;
      playbackDebugLog("MOUNT", "Spotify IFrame API ready");
      resolve(api);
    };

    const previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      previous?.(api);
      finish(api);
    };

    const existing = document.querySelector(`script[src="${SPOTIFY_IFRAME_API}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.src = SPOTIFY_IFRAME_API;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load Spotify IFrame API"));
      document.body.appendChild(script);
      playbackDebugLog("MOUNT", "Spotify IFrame API script injected");
    }
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
  private ready = false;
  private initPromise: Promise<SpotifyEmbedController> | null = null;

  mount(container: HTMLElement, width: number, height: number): Promise<SpotifyEmbedController> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const api = await loadSpotifyIframeApi();

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
              this.controller = controller;
              this.ready = true;
              controller.addListener("ready", () => {
                playbackDebugLog("SPOTIFY", "embed controller ready");
              });
              playbackDebugLog("MOUNT", "Spotify embed controller created");
              resolve(controller);
            },
          );
        } catch (err) {
          reject(err);
        }
      });
    })();

    return this.initPromise;
  }

  isReady(): boolean {
    return this.ready && !!this.controller;
  }

  getController(): SpotifyEmbedController | null {
    return this.controller;
  }

  destroy(): void {
    try {
      this.controller?.destroy();
    } catch {
      // ignore teardown errors
    }
    this.controller = null;
    this.ready = false;
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
  controller.loadUri(uri);
  try {
    controller.play();
  } catch (err) {
    playbackDebugError("SPOTIFY", "controller.play() failed — autoplay risk", err);
    throw err;
  }
  return controller;
}
