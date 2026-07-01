import type { PlaybackItem } from "@/lib/music/playback";

/** Resolved media target the engine hands to a provider. */
export interface ProviderPlayRequest {
  item: PlaybackItem;
  sourceUrl: string;
  generation: number;
}

/**
 * Contract for interchangeable media backends.
 * Implementations live inside the playback engine — UI must never import them.
 */
export interface MediaProvider {
  readonly kind: "audio" | "spotify" | "youtube";

  play(request: ProviderPlayRequest): void | Promise<void>;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  destroy(): void;
}

export type TransportPatch = {
  currentTrack?: PlaybackItem | null;
  isPlaying?: boolean;
  isLoading?: boolean;
  currentTime?: number;
  duration?: number;
  error?: string | null;
};
