/**
 * Playback pipeline debug logging — no UI impact.
 * Enable in console: localStorage.setItem('vf:playback-debug', '1')
 * Dump state: window.__playbackDebugDump()
 */

export type PlaybackDebugStep =
  | "CLICK"
  | "TRACK"
  | "STORE"
  | "ENGINE"
  | "PLAYER"
  | "MOUNT"
  | "DOM"
  | "SOURCE"
  | "EMBED"
  | "AUDIO"
  | "SPOTIFY"
  | "RACE"
  | "LISTENER";

const STORAGE_KEY = "vf:playback-debug";

function isEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

export function playbackDebugLog(step: PlaybackDebugStep, message: string, data?: unknown): void {
  if (!isEnabled()) return;
  if (data !== undefined) {
    console.log(`[${step}] ${message}`, data);
  } else {
    console.log(`[${step}] ${message}`);
  }
}

export function playbackDebugWarn(step: PlaybackDebugStep, message: string, data?: unknown): void {
  if (!isEnabled()) return;
  if (data !== undefined) {
    console.warn(`[${step}] ${message}`, data);
  } else {
    console.warn(`[${step}] ${message}`);
  }
}

export function playbackDebugError(step: PlaybackDebugStep, message: string, data?: unknown): void {
  if (data !== undefined) {
    console.error(`[${step}] ${message}`, data);
  } else {
    console.error(`[${step}] ${message}`);
  }
}

export interface PlaybackDomProbe {
  rootPresent: boolean;
  iframePresent: boolean;
  audioPresent: boolean;
  iframeSrc: string | null;
  audioSrc: string | null;
  audioPaused: boolean | null;
  /** `#vitalforge-playback-root` engine mount on document.body */
  engineRootPresent: boolean;
  /** Bottom GlobalPlayer UI bar — only visible after React renders currentTrack */
  globalPlayerPresent: boolean;
}

export interface EmbedAudibilityProbe {
  iframeDimensions: { width: number; height: number; attrWidth: string | null; attrHeight: string | null };
  containerStyles: {
    position: string;
    left: string;
    top: string;
    bottom: string;
    opacity: string;
    display: string;
    visibility: string;
    width: string;
    height: string;
    zIndex: string;
  };
  iframeStyles: {
    position: string;
    opacity: string;
    display: string;
    visibility: string;
    width: string;
    height: string;
  };
  inViewport: boolean;
  containerRect: { left: number; top: number; width: number; height: number } | null;
  iframeRect: { left: number; top: number; width: number; height: number } | null;
  checks: {
    iframeHidden: boolean;
    outsideViewport: boolean;
    tooSmall: boolean;
    displayNone: boolean;
    visibilityHidden: boolean;
    opacityZero: boolean;
    sandboxPresent: boolean;
    iframeMutedAttr: boolean;
    autoplayInUrl: boolean;
    iframeRemovedAfterLoad: boolean;
  };
  iframeAllow: string | null;
  iframeSandbox: string | null;
  iframeSrc: string | null;
  embedProvider: "spotify" | "youtube" | "blank" | "other" | null;
  audibilityRisk: string[];
}

export function probePlaybackDom(): PlaybackDomProbe {
  if (typeof document === "undefined") {
    return {
      rootPresent: false,
      iframePresent: false,
      audioPresent: false,
      iframeSrc: null,
      audioSrc: null,
      audioPaused: null,
      engineRootPresent: false,
      globalPlayerPresent: false,
    };
  }
  const root = document.getElementById("vitalforge-playback-root");
  const iframe = root?.querySelector("iframe") ?? null;
  const audio = root?.querySelector("audio") ?? null;
  const querySelector = typeof document.querySelector === "function" ? document.querySelector.bind(document) : null;
  return {
    rootPresent: !!root,
    iframePresent: !!iframe,
    audioPresent: !!audio,
    iframeSrc: iframe?.getAttribute("src") ?? null,
    audioSrc: audio?.getAttribute("src") ?? audio?.currentSrc ?? null,
    audioPaused: audio ? audio.paused : null,
    engineRootPresent: !!root?.isConnected,
    globalPlayerPresent: querySelector ? !!querySelector('[aria-label="Now playing"]') : false,
  };
}

function parseEmbedProvider(src: string | null): EmbedAudibilityProbe["embedProvider"] {
  if (!src || src === "about:blank") return "blank";
  if (src.includes("open.spotify.com/embed")) return "spotify";
  if (src.includes("youtube.com/embed")) return "youtube";
  return "other";
}

export function probeEmbedAudibility(): EmbedAudibilityProbe {
  const empty: EmbedAudibilityProbe = {
    iframeDimensions: { width: 0, height: 0, attrWidth: null, attrHeight: null },
    containerStyles: {
      position: "",
      left: "",
      top: "",
      bottom: "",
      opacity: "",
      display: "",
      visibility: "",
      width: "",
      height: "",
      zIndex: "",
    },
    iframeStyles: {
      position: "",
      opacity: "",
      display: "",
      visibility: "",
      width: "",
      height: "",
    },
    inViewport: false,
    containerRect: null,
    iframeRect: null,
    checks: {
      iframeHidden: true,
      outsideViewport: true,
      tooSmall: true,
      displayNone: false,
      visibilityHidden: false,
      opacityZero: false,
      sandboxPresent: false,
      iframeMutedAttr: false,
      autoplayInUrl: false,
      iframeRemovedAfterLoad: true,
    },
    iframeAllow: null,
    iframeSandbox: null,
    iframeSrc: null,
    embedProvider: null,
    audibilityRisk: ["iframe missing"],
  };

  if (typeof document === "undefined") return empty;

  const root = document.getElementById("vitalforge-playback-root");
  const iframe = root?.querySelector("iframe") as HTMLIFrameElement | null;
  if (!root || !iframe) {
    return { ...empty, audibilityRisk: ["playback root or iframe missing"] };
  }

  const containerCs = getComputedStyle(root);
  const iframeCs = getComputedStyle(iframe);
  const containerRect = root.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const inViewport =
    iframeRect.width > 0 &&
    iframeRect.height > 0 &&
    iframeRect.right > 0 &&
    iframeRect.bottom > 0 &&
    iframeRect.left < vw &&
    iframeRect.top < vh;

  const src = iframe.getAttribute("src") ?? iframe.src ?? null;
  const opacityZero =
    parseFloat(containerCs.opacity) === 0 ||
    parseFloat(iframeCs.opacity) === 0 ||
    containerCs.opacity === "0" ||
    iframeCs.opacity === "0";

  const displayNone = containerCs.display === "none" || iframeCs.display === "none";
  const visibilityHidden =
    containerCs.visibility === "hidden" || iframeCs.visibility === "hidden";
  const tooSmall = iframeRect.width < 200 || iframeRect.height < 80;
  const sandboxPresent = iframe.hasAttribute("sandbox");
  const iframeMutedAttr = iframe.hasAttribute("muted") || iframe.getAttribute("muted") === "";
  const autoplayInUrl = !!src && (src.includes("autoplay=1") || src.includes("autoplay=true"));

  const audibilityRisk: string[] = [];
  if (displayNone) audibilityRisk.push("display:none on container or iframe");
  if (visibilityHidden) audibilityRisk.push("visibility:hidden on container or iframe");
  if (opacityZero) audibilityRisk.push("opacity:0 blocks audible embed playback");
  if (tooSmall) audibilityRisk.push("iframe smaller than 200×80 (Spotify minimum ~352×152)");
  if (sandboxPresent) audibilityRisk.push("sandbox attribute may block media");
  if (iframeMutedAttr) audibilityRisk.push("iframe muted attribute set");
  if (src && src !== "about:blank" && !autoplayInUrl)
    audibilityRisk.push("autoplay param missing from embed URL");
  if (!iframe.isConnected) audibilityRisk.push("iframe detached from DOM");

  return {
    iframeDimensions: {
      width: Math.round(iframeRect.width),
      height: Math.round(iframeRect.height),
      attrWidth: iframe.style.width || null,
      attrHeight: iframe.style.height || null,
    },
    containerStyles: {
      position: containerCs.position,
      left: containerCs.left,
      top: containerCs.top,
      bottom: containerCs.bottom,
      opacity: containerCs.opacity,
      display: containerCs.display,
      visibility: containerCs.visibility,
      width: containerCs.width,
      height: containerCs.height,
      zIndex: containerCs.zIndex,
    },
    iframeStyles: {
      position: iframeCs.position,
      opacity: iframeCs.opacity,
      display: iframeCs.display,
      visibility: iframeCs.visibility,
      width: iframeCs.width,
      height: iframeCs.height,
    },
    inViewport,
    containerRect: {
      left: Math.round(containerRect.left),
      top: Math.round(containerRect.top),
      width: Math.round(containerRect.width),
      height: Math.round(containerRect.height),
    },
    iframeRect: {
      left: Math.round(iframeRect.left),
      top: Math.round(iframeRect.top),
      width: Math.round(iframeRect.width),
      height: Math.round(iframeRect.height),
    },
    checks: {
      iframeHidden: displayNone || visibilityHidden || opacityZero,
      outsideViewport: !inViewport,
      tooSmall,
      displayNone,
      visibilityHidden,
      opacityZero,
      sandboxPresent,
      iframeMutedAttr,
      autoplayInUrl,
      iframeRemovedAfterLoad: !iframe.isConnected,
    },
    iframeAllow: iframe.getAttribute("allow"),
    iframeSandbox: iframe.getAttribute("sandbox"),
    iframeSrc: src,
    embedProvider: parseEmbedProvider(src),
    audibilityRisk,
  };
}

export function installPlaybackDebugDump(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __playbackDebugDump?: () => Record<string, unknown> };
  w.__playbackDebugDump = () => {
    const probe = probePlaybackDom();
    const audibility = probeEmbedAudibility();
    let store: Record<string, unknown> | null = null;
    try {
      // Lazy import avoids circular deps at module init
      const { usePlaybackStore } = require("@/stores/playback-store") as typeof import("@/stores/playback-store");
      const s = usePlaybackStore.getState();
      store = {
        currentTrack: s.currentTrack?.refId ?? null,
        isPlaying: s.isPlaying,
        isLoading: s.isLoading,
        error: s.error,
        hydrated: s.hydrated,
        engineRootPresent: probe.engineRootPresent,
        globalPlayerUiPresent: probe.globalPlayerPresent,
      };
    } catch {
      store = { error: "store unavailable" };
    }
    const dump = { dom: probe, audibility, store, ts: Date.now() };
    playbackDebugLog("DOM", "Manual dump requested", dump);
    return dump;
  };
}
