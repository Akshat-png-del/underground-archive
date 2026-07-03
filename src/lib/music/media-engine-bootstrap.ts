/**
 * One-time MediaEngine bootstrap — runs outside React component lifecycle.
 *
 * The engine DOM root and ProviderRouter are created exactly once per page load.
 * UI mounts, rerenders, and navigation must never reinitialize this layer.
 */
import { globalPlayerEngine } from "@/lib/music/global-player-engine";
import { playbackDebugLog } from "@/lib/music/playback-debug";
import { preloadSpotifyIframeApi } from "@/lib/music/spotify-embed-api";

let bootstrapped = false;

export function isMediaEngineBootstrapped(): boolean {
  return bootstrapped;
}

/** Mount singleton engine + router. Safe to call repeatedly — no-op after first success. */
export function bootstrapMediaEngine(): void {
  if (typeof window === "undefined") return;
  if (bootstrapped) {
    globalPlayerEngine.mount();
    return;
  }

  playbackDebugLog("MOUNT", "MediaEngine bootstrap — first init");
  preloadSpotifyIframeApi();
  globalPlayerEngine.mount();
  bootstrapped = true;
}

/** @internal Reset bootstrap flag between contract tests. */
export function __resetMediaEngineBootstrapForTests(): void {
  bootstrapped = false;
}
