import { playbackDebugLog, playbackDebugWarn } from "@/lib/music/playback-debug";
import { logAnchorReady } from "@/lib/music/media-binding-debug";

const ROOT_ID = "vitalforge-playback-root";

let anchorHost: HTMLElement | null = null;
let anchorWaiters: Array<(node: HTMLElement) => void> = [];

/** Register the persistent PlaybackMediaAnchor host element. */
export function registerPlaybackMediaAnchor(node: HTMLElement | null): void {
  if (node?.isConnected) {
    anchorHost = node;
    logAnchorReady({ connected: true });
    const waiters = anchorWaiters;
    anchorWaiters = [];
    for (const resolve of waiters) resolve(node);
    return;
  }
  if (!node) {
    playbackDebugWarn("MOUNT", "PlaybackMediaAnchor unregistered");
    anchorHost = null;
  }
}

export function getPlaybackMediaAnchor(): HTMLElement | null {
  return anchorHost?.isConnected ? anchorHost : null;
}

/** Provider mount target — engine root inside anchor, or anchor as fallback. */
export function getProviderMountNode(): HTMLElement | null {
  const root = document.getElementById(ROOT_ID) as HTMLElement | null;
  if (root?.isConnected) {
    const anchor = getPlaybackMediaAnchor();
    if (anchor && (root === anchor || root.parentElement === anchor || anchor.contains(root))) {
      return root;
    }
    if (!anchor) return root;
  }
  return getPlaybackMediaAnchor();
}

export function isPlaybackMediaAnchorReady(): boolean {
  return !!getProviderMountNode();
}

export function waitForPlaybackMediaAnchor(timeoutMs = 5000): Promise<HTMLElement> {
  const existing = getProviderMountNode();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      anchorWaiters = anchorWaiters.filter((w) => w !== onReady);
      reject(new Error("PlaybackMediaAnchor not ready"));
    }, timeoutMs);

    const onReady = (node: HTMLElement) => {
      clearTimeout(timer);
      const mount = getProviderMountNode() ?? node;
      resolve(mount);
    };

    anchorWaiters.push(onReady);
  });
}

/** @internal */
export function __resetPlaybackMediaAnchorForTests(): void {
  anchorHost = null;
  anchorWaiters = [];
}
