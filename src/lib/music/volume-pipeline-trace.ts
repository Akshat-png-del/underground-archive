/**
 * Volume pipeline runtime trace — logging only, no behavior changes.
 * Enable: localStorage.setItem('vf:volume-trace', '1')
 */

const STORAGE_KEY = "vf:volume-trace";

let traceSeq = 0;

export function isVolumePipelineTraceEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

function nextId(): number {
  traceSeq += 1;
  return traceSeq;
}

function readDomAudio(): { volume: number | null; muted: boolean | null; present: boolean } {
  if (typeof document === "undefined") {
    return { volume: null, muted: null, present: false };
  }
  const audio = document.querySelector("#vitalforge-playback-root audio") as HTMLAudioElement | null;
  if (!audio) return { volume: null, muted: null, present: false };
  return { volume: audio.volume, muted: audio.muted, present: true };
}

export type VolumeTraceInitiator =
  | "PlaybackVolumeControl"
  | "playback-actions"
  | "MediaSessionController"
  | "GlobalPlayerEngine"
  | "ProviderRouter"
  | "AudioProvider"
  | "SpotifyProvider"
  | "YoutubeProvider"
  | "provider-playback_update"
  | "unknown";

export type VolumeTraceDetail = {
  initiator: VolumeTraceInitiator;
  fn: string;
  phase: string;
  previousVolume?: number | null;
  newVolume?: number | null;
  previousMuted?: boolean | null;
  newMuted?: boolean | null;
  muteChanged?: boolean;
  providerKind?: string | null;
  providerAccepted?: boolean | null;
  providerOverwrote?: boolean | null;
  mscOverwrote?: boolean | null;
  storeVolume?: number | null;
  storeMuted?: boolean | null;
  snapshotVolume?: number | null;
  snapshotMuted?: boolean | null;
  uiSliderValue?: number | null;
  domAudioVolume?: number | null;
  domAudioMuted?: boolean | null;
  domAudioPresent?: boolean;
  activeRouterKind?: string | null;
  note?: string;
  extra?: Record<string, unknown>;
};

export function volumePipelineTrace(detail: VolumeTraceDetail): void {
  if (!isVolumePipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dom = readDomAudio();
  const payload = {
    id,
    ts,
    ...detail,
    domAudioVolume: detail.domAudioVolume ?? dom.volume,
    domAudioMuted: detail.domAudioMuted ?? dom.muted,
    domAudioPresent: detail.domAudioPresent ?? dom.present,
  };
  console.log(`[VOLUME-TRACE] ${detail.fn} ${detail.phase}`, payload);
}

export function volumeTraceInstallWindowSample(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __volumeTraceSample?: (label?: string) => Record<string, unknown> };
  w.__volumeTraceSample = (label = "sample") => {
    try {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      const { globalPlayerEngine } =
        require("@/lib/music/global-player-engine") as typeof import("@/lib/music/global-player-engine");
      const { usePlaybackStore } =
        require("@/stores/playback-store") as typeof import("@/stores/playback-store");
      const { __getCommittedPlaybackSnapshotForAudit } =
        require("@/lib/music/use-final-playback-snapshot") as typeof import("@/lib/music/use-final-playback-snapshot");
      const { ProviderRouter } =
        require("@/lib/music/providers/provider-router") as typeof import("@/lib/music/providers/provider-router");

      const msc = mediaSessionController.getState();
      const engine = globalPlayerEngine.getSnapshot();
      const store = usePlaybackStore.getState();
      const snapshot = __getCommittedPlaybackSnapshotForAudit();
      const dom = readDomAudio();
      const slider = document.querySelector(".player-volume-slider") as HTMLInputElement | null;
      const routerKind = (globalPlayerEngine as { router?: { getActiveKind?: () => string | null } }).router?.getActiveKind?.() ?? null;

      const sample = {
        label,
        ts: Date.now(),
        msc: { volume: msc.volume, muted: msc.muted },
        engine: { mode: engine.mode, refId: engine.currentTrack?.refId ?? null },
        store: { volume: store.volume, muted: store.muted },
        snapshot: { volume: snapshot.volume, muted: snapshot.muted },
        ui: { sliderValue: slider ? Number(slider.value) : null, sliderPresent: !!slider },
        dom,
        routerKind,
      };
      volumePipelineTrace({
        initiator: "unknown",
        fn: "__volumeTraceSample",
        phase: label,
        previousVolume: msc.volume,
        previousMuted: msc.muted,
        storeVolume: store.volume,
        storeMuted: store.muted,
        snapshotVolume: snapshot.volume,
        snapshotMuted: snapshot.muted,
        uiSliderValue: slider ? Number(slider.value) : null,
        domAudioVolume: dom.volume,
        domAudioMuted: dom.muted,
        domAudioPresent: dom.present,
        activeRouterKind: routerKind,
        extra: sample,
      });
      return sample;
    } catch (err) {
      return { label, error: err instanceof Error ? err.message : String(err) };
    }
  };

  w.__volumeAudit = {
    setVolume: (volume: number) => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.setVolume(volume);
    },
    toggleMute: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.toggleMute();
    },
    playPreview: () => {
      const { mediaSessionController } =
        require("@/lib/music/media-session-controller") as typeof import("@/lib/music/media-session-controller");
      mediaSessionController.play({
        type: "track",
        refId: "volume-audit::preview-test",
        title: "Volume Audit Preview",
        previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      });
    },
  };
}
