import type { PlaybackItem } from "@/lib/music/playback";
import { isVideoPlaybackItem } from "@/lib/music/playback";
import { resolvePlaybackExperience } from "@/lib/music/playback-experience";
import type { ProviderKind } from "@/lib/music/providers/playback-provider";

/**
 * Three-domain architecture lock — AUDIO | VIDEO | SETS.
 *
 * AUDIO  → SpotifyProvider, AudioProvider, AudioPlayerBar transport
 * VIDEO  → YouTubeProvider, native embed controls on watch surfaces
 * SETS   → navigation + watch UI only (no media transport logic)
 *
 * Do not import this module from Sets/Video UI for control paths.
 * Use for dev-time regression detection and agent documentation anchors.
 */
export type MediaDomain = "audio" | "video" | "idle";

const DOMAIN_LOCK_TAG = "[DOMAIN LOCK]";

export function resolveActiveMediaDomain(item: PlaybackItem | null | undefined): MediaDomain {
  if (!item) return "idle";
  return resolvePlaybackExperience(item) === "video" ? "video" : "audio";
}

export function isAudioDomainItem(item: PlaybackItem | null | undefined): boolean {
  if (!item) return false;
  return !isVideoPlaybackItem(item);
}

export function isAudioProviderKind(kind: ProviderKind | null | undefined): boolean {
  return kind === "audio" || kind === "spotify";
}

export function isVideoProviderKind(kind: ProviderKind | null | undefined): boolean {
  return kind === "youtube";
}

function isDev(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

/** Dev-only: audio transport actions must not run while video experience is active. */
export function warnIfAudioTransportInVideoContext(action: string, item: PlaybackItem | null): void {
  if (!isDev() || !item) return;
  if (resolvePlaybackExperience(item) !== "video") return;
  console.warn(`${DOMAIN_LOCK_TAG} ${action} blocked — video experience owns transport`, {
    refId: item.refId,
    type: item.type,
  });
}

/** Dev-only: AudioPlayerBar must not coexist with set watch page chrome. */
export function assertAudioBarNotOnSetWatchPage(surface: string): void {
  if (!isDev() || typeof document === "undefined") return;
  const onSetWatch = !!document.querySelector("[data-set-watch-page]");
  const bar = document.querySelector("[data-audio-player]");
  const audioBarVisible = !!bar;
  if (onSetWatch && audioBarVisible) {
    throw new Error(
      `${DOMAIN_LOCK_TAG} ${surface} — audio bar must not render on set watch page`,
    );
  }
}

/** Dev-only: Sets navigation must not call audio transport directly. */
export function warnIfSetItemUsesAudioTransport(action: string, item: PlaybackItem): void {
  if (!isDev()) return;
  if (item.type !== "set") return;
  console.warn(`${DOMAIN_LOCK_TAG} ${action} — sets must navigate to /sets/[slug], not audio transport`, {
    refId: item.refId,
  });
}
