import { playbackDebugLog } from "@/lib/music/playback-debug";
import type { ProviderKind, ProviderState } from "@/lib/music/providers/playback-provider";

export function logProviderInit(kind: ProviderKind, detail?: Record<string, unknown>): void {
  playbackDebugLog("PROVIDER", "[PROVIDER INIT]", { kind, ...detail });
}

export function logProviderLoad(
  kind: ProviderKind,
  refId: string,
  detail?: Record<string, unknown>,
): void {
  playbackDebugLog("PROVIDER", "[PROVIDER LOAD]", { kind, refId, ...detail });
}

export function logProviderPlay(kind: ProviderKind, refId: string): void {
  playbackDebugLog("PROVIDER", "[PROVIDER PLAY]", { kind, refId });
}

export function logProviderPause(kind: ProviderKind, refId?: string): void {
  playbackDebugLog("PROVIDER", "[PROVIDER PAUSE]", { kind, refId });
}

export function logProviderSwitch(from: ProviderKind | null, to: ProviderKind, refId: string): void {
  playbackDebugLog("PROVIDER", "[PROVIDER SWITCH]", { from, to, refId });
}

export function logProviderDestroy(kind: ProviderKind | null): void {
  playbackDebugLog("PROVIDER", "[PROVIDER DESTROY]", { kind });
}

export function logProviderSeek(kind: ProviderKind | null, seconds: number): void {
  playbackDebugLog("PROVIDER", "[PROVIDER SEEK]", { kind, seconds });
}

export function logProviderState(kind: ProviderKind | null, state: ProviderState): void {
  playbackDebugLog("PROVIDER", "[PROVIDER STATE]", {
    kind,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    currentTime: state.currentTime,
    duration: state.duration,
    error: state.error,
  });
}
