import { playbackDebugLog, playbackDebugError } from "@/lib/music/playback-debug";

const YOUTUBE_IFRAME_API = "https://www.youtube.com/iframe_api";

export interface YouTubeEmbedPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
  getPlayerState(): number;
}

interface YouTubePlayerOptions {
  height: string | number;
  width: string | number;
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YouTubeEmbedPlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubeEmbedPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YouTubeIframeApi {
  Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubeEmbedPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type WindowWithYt = Window & {
  __vitalforgeYoutubeIframeApi?: YouTubeIframeApi;
};

let apiPromise: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube IFrame API requires a browser"));
  }

  const w = window as WindowWithYt;
  if (w.YT?.Player) {
    return Promise.resolve(w.YT);
  }
  if (w.__vitalforgeYoutubeIframeApi) {
    return Promise.resolve(w.__vitalforgeYoutubeIframeApi);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const finish = (api: YouTubeIframeApi) => {
      w.__vitalforgeYoutubeIframeApi = api;
      playbackDebugLog("MOUNT", "YouTube IFrame API ready");
      resolve(api);
    };

    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existing) {
      const poll = () => {
        if (w.YT?.Player) {
          finish(w.YT);
          return;
        }
        setTimeout(poll, 50);
      };
      poll();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      if (w.YT?.Player) finish(w.YT);
      else reject(new Error("YouTube IFrame API loaded without YT.Player"));
    };

    const script = document.createElement("script");
    script.src = YOUTUBE_IFRAME_API;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function createYouTubePlayer(
  host: HTMLElement,
  videoId: string,
  width: number,
  height: number,
  events?: YouTubePlayerOptions["events"],
): Promise<YouTubeEmbedPlayer> {
  return loadYouTubeIframeApi().then(
    (api) =>
      new Promise((resolve, reject) => {
        let player: YouTubeEmbedPlayer | null = null;
        try {
          player = new api.Player(host, {
            height,
            width,
            videoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              fs: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
              ...(typeof window !== "undefined" && window.location?.origin
                ? { origin: window.location.origin }
                : {}),
            },
            events: {
              onReady: (event) => {
                events?.onReady?.(event);
                resolve(event.target);
              },
              onStateChange: (event) => {
                events?.onStateChange?.(event);
              },
              onError: (event) => {
                events?.onError?.(event);
                if (!player) {
                  reject(new Error(`YouTube player error (${event.data})`));
                }
              },
            },
          });
        } catch (err) {
          playbackDebugError("EMBED", "YouTube player creation failed", err);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
  );
}
