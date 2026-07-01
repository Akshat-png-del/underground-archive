import { playbackDebugLog } from "@/lib/music/playback-debug";

export function logUiPlayerRemoved(detail?: string): void {
  playbackDebugLog("BINDING", "[UI PLAYER REMOVED]", { detail });
}

export function logMediaEngineActive(detail?: Record<string, unknown>): void {
  playbackDebugLog("BINDING", "[MEDIA ENGINE ACTIVE]", detail);
}

export function logProviderAttached(kind: string, refId?: string): void {
  playbackDebugLog("BINDING", "[PROVIDER ATTACHED]", { kind, refId });
}

export function logVideoLoaded(videoId: string, refId?: string): void {
  playbackDebugLog("BINDING", "[VIDEO LOADED]", { videoId, refId });
}

export function logPlaybackStarted(kind: string, refId?: string): void {
  playbackDebugLog("BINDING", "[PLAYBACK STARTED]", { kind, refId });
}

export function logSeekExecuted(seconds: number, kind?: string | null): void {
  playbackDebugLog("BINDING", "[SEEK EXECUTED]", { seconds, kind });
}

export function logStateSync(patch: Record<string, unknown>): void {
  playbackDebugLog("BINDING", "[STATE SYNC]", patch);
}

export function logAnchorReady(detail?: Record<string, unknown>): void {
  playbackDebugLog("BINDING", "[ANCHOR READY]", detail);
}

export function logProviderCreated(kind: string): void {
  playbackDebugLog("BINDING", "[PROVIDER CREATED]", { kind });
}

export function logProviderReady(kind: string, refId?: string): void {
  playbackDebugLog("BINDING", "[PROVIDER READY]", { kind, refId });
}

export function logCommandQueued(command: string, detail?: Record<string, unknown>): void {
  playbackDebugLog("BINDING", "[COMMAND QUEUED]", { command, ...detail });
}

export function logCommandExecuted(command: string, detail?: Record<string, unknown>): void {
  playbackDebugLog("BINDING", "[COMMAND EXECUTED]", { command, ...detail });
}

export function logPlaybackConfirmed(kind: string, refId?: string): void {
  playbackDebugLog("BINDING", "[PLAYBACK CONFIRMED]", { kind, refId });
}
