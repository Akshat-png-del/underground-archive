import type { PlaybackItem } from "@/lib/music/playback";

export type MediaEngineEvent =
  | { type: "onInit" }
  | { type: "onPlay"; track: PlaybackItem | null }
  | { type: "onPause"; track: PlaybackItem | null }
  | { type: "onSeek"; time: number }
  | { type: "onTimeUpdate"; currentTime: number; duration: number }
  | { type: "onTrackChange"; track: PlaybackItem | null }
  | { type: "onReady"; track: PlaybackItem | null }
  | { type: "onEnded"; track: PlaybackItem | null }
  | { type: "onError"; error: string; track: PlaybackItem | null };

export type MediaEngineEventListener = (event: MediaEngineEvent) => void;

class MediaEngineEventBus {
  private listeners = new Set<MediaEngineEventListener>();

  subscribe(listener: MediaEngineEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: MediaEngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const mediaEngineEvents = new MediaEngineEventBus();

/** @internal Reset between contract tests. */
export function __resetMediaEngineEventsForTests(): void {
  (mediaEngineEvents as unknown as { listeners: Set<MediaEngineEventListener> }).listeners = new Set();
}
