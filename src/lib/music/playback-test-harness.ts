/**
 * @internal Test-only utilities for playback contract tests.
 */
import { usePlaybackStore, type PlaybackStore, __resetPlaybackModuleForTests } from "@/stores/playback-store";
import { __resetGlobalPlayerEngineForTests, globalPlayerEngine } from "@/lib/music/global-player-engine";
import { __resetMediaEngineBootstrapForTests, bootstrapMediaEngine } from "@/lib/music/media-engine-bootstrap";
import { __resetMediaEngineEventsForTests } from "@/lib/music/media-engine-events";
import { __resetPlaybackActionsForTests } from "@/lib/music/playback-actions";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { __resetPlaybackMediaAnchorForTests } from "@/lib/music/playback-media-anchor-registry";
import { __resetFinalPlaybackSnapshotForTests } from "@/lib/music/use-final-playback-snapshot";

export const INITIAL_PLAYBACK_STORE: Pick<
  PlaybackStore,
  | "currentTrack"
  | "queue"
  | "queueIndex"
  | "isPlaying"
  | "isLoading"
  | "currentTime"
  | "duration"
  | "error"
  | "detailsOpen"
  | "hydrated"
> = {
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  error: null,
  detailsOpen: false,
  hydrated: true,
};

export function resetPlaybackForTests(): void {
  __resetPlaybackModuleForTests();
  __resetPlaybackActionsForTests();
  mediaSessionController.__resetForTests();
  __resetMediaEngineEventsForTests();
  __resetMediaEngineBootstrapForTests();
  __resetPlaybackMediaAnchorForTests();
  __resetGlobalPlayerEngineForTests();
  usePlaybackStore.setState(INITIAL_PLAYBACK_STORE);
  bootstrapMediaEngine();
  __resetFinalPlaybackSnapshotForTests();
}
