import type { PlaybackItem } from "@/lib/music/playback";

export type ProviderKind = "audio" | "spotify" | "youtube";

export interface ProviderPlayRequest {
  item: PlaybackItem;
  sourceUrl: string;
  videoId?: string | null;
  generation: number;
}

export interface ProviderState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

export type ProviderStateListener = (state: ProviderState) => void;

/**
 * Strict lifecycle provider contract.
 * MediaEngine/ProviderRouter MUST NOT call play/seek until isReady === true.
 */
export interface PlaybackProvider {
  readonly kind: ProviderKind;
  readonly isReady: boolean;

  attach(domNode: HTMLElement): void;
  init(): Promise<void>;
  load(request: ProviderPlayRequest): Promise<void>;
  startPlayback(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(positionSeconds: number): void;
  getState(): ProviderState;
  destroy(): void;

  waitUntilReady(): Promise<void>;
  onReady(callback: () => void): () => void;
  onError(callback: (message: string) => void): () => void;

  setStateListener(listener: ProviderStateListener | null): void;

  /** Full load + play sequence (router may call steps individually). */
  play(request: ProviderPlayRequest): Promise<void>;
}

export const EMPTY_PROVIDER_STATE: ProviderState = {
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  error: null,
};
