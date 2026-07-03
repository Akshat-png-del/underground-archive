/**
 * Spotify seek root-cause audit — logging only.
 * Enable: localStorage.setItem('vf:spotify-seek-audit', '1')
 */

const STORAGE_KEY = "vf:spotify-seek-audit";
let seq = 0;
let lastSeekRequestedAt = 0;
let lastSeekTargetMs = 0;

export function isSpotifySeekAuditEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

export function spotifySeekAuditMarkSeek(targetMs: number): void {
  lastSeekRequestedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  lastSeekTargetMs = targetMs;
}

export function msSinceLastSeek(): number | null {
  if (lastSeekRequestedAt === 0) return null;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return now - lastSeekRequestedAt;
}

export function followsSeek(withinMs = 5000): boolean {
  const delta = msSinceLastSeek();
  return delta !== null && delta >= 0 && delta <= withinMs;
}

export function lastSeekTargetMilliseconds(): number {
  return lastSeekTargetMs;
}

let lastPlaybackUpdateRaw: Record<string, unknown> | null = null;
let lastPlaybackUpdateAt = 0;

export function spotifySeekAuditRecordPlaybackUpdate(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  lastPlaybackUpdateRaw = { ...data };
  lastPlaybackUpdateAt = typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function spotifySeekAuditLastPlaybackUpdate(): {
  raw: Record<string, unknown> | null;
  at: number;
} {
  return { raw: lastPlaybackUpdateRaw, at: lastPlaybackUpdateAt };
}

export type SpotifySeekAuditKind =
  | "COMMAND"
  | "SEEK"
  | "HOST_SEEK"
  | "PLAYBACK_UPDATE"
  | "PLAYBACK_STARTED"
  | "SDK_CALLBACK"
  | "STATE_PATCH";

export function spotifySeekAudit(
  source: string,
  kind: SpotifySeekAuditKind,
  detail?: Record<string, unknown>,
): void {
  if (!isSpotifySeekAuditEnabled()) return;
  seq += 1;
  const ts = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.log(`[SPOTIFY-SEEK-AUDIT] ${source} ${kind}`, {
    id: seq,
    ts: Number(ts.toFixed(1)),
    msSinceSeek: msSinceLastSeek(),
    followsSeek: followsSeek(),
    lastSeekTargetMs: lastSeekTargetMs || null,
    ...detail,
  });
}
