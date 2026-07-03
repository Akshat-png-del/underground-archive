import type { PlaybackItem } from "@/lib/music/playback";
import { hydratePlaybackItem, hydratePlaybackQueue } from "@/lib/music/playback";
import { logStateSync } from "@/lib/music/media-binding-debug";
import { clearPersistedPlayback } from "@/lib/music/playback-persistence";
import { schedulePlaybackPersist, usePlaybackStore } from "@/stores/playback-store";
import { playPausePipelineTrace } from "@/lib/music/play-pause-pipeline-trace";
import {
  hydrationPipelineTrace,
  hydrationTraceMarkMirror,
  hydrationTraceMarkStart,
  hydrationTraceMarkFinish,
} from "@/lib/music/hydration-pipeline-trace";

type MirrorPatch = {
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  volume: number;
  muted: boolean;
};

export type MirrorSessionPatch = { detailsOpen?: boolean; hydrated?: boolean };

type HydratedPausedSession = {
  track: PlaybackItem;
  queue: PlaybackItem[];
  queueIndex: number;
  position: number;
};

export class MediaSessionPersistence {
  pushLegacyMirror(patch: MirrorPatch, sessionPatch?: MirrorSessionPatch): void {
    const nextPatch = { ...patch, ...sessionPatch };
    const prior = usePlaybackStore.getState();
    hydrationTraceMarkMirror("MediaSessionPersistence.pushLegacyMirror");
    hydrationPipelineTrace({
      fn: "MediaSessionPersistence.pushLegacyMirror",
      phase: "mirror_push",
      msc: {
        activeTrack: nextPatch.currentTrack?.refId ?? null,
        queueLength: nextPatch.queue.length,
        queueIndex: nextPatch.queueIndex,
        currentTime: nextPatch.currentTime,
        duration: nextPatch.duration,
        isPlaying: nextPatch.isPlaying,
        volume: nextPatch.volume,
        muted: nextPatch.muted,
        detailsOpen: sessionPatch?.detailsOpen,
        hydrated: sessionPatch?.hydrated,
      },
      store: {
        activeTrack: prior.currentTrack?.refId ?? null,
        queueLength: prior.queue.length,
        queueIndex: prior.queueIndex,
        currentTime: prior.currentTime,
        duration: prior.duration,
        isPlaying: prior.isPlaying,
        volume: prior.volume,
        muted: prior.muted,
        detailsOpen: prior.detailsOpen,
        hydrated: prior.hydrated,
      },
      extra: {
        storeWillReceive: {
          activeTrack: nextPatch.currentTrack?.refId ?? null,
          queueIndex: nextPatch.queueIndex,
          isPlaying: nextPatch.isPlaying,
          currentTime: nextPatch.currentTime,
          volume: nextPatch.volume,
          muted: nextPatch.muted,
          hydrated: sessionPatch?.hydrated,
          detailsOpen: sessionPatch?.detailsOpen,
        },
      },
    });
    if (prior.isPlaying !== nextPatch.isPlaying) {
      playPausePipelineTrace({
        fn: "MediaSessionPersistence.pushLegacyMirror",
        phase: "store_mirror",
        event: nextPatch.isPlaying ? "play" : "pause",
        mscIsPlaying: nextPatch.isPlaying,
        storeIsPlaying: nextPatch.isPlaying,
        activeTrack: nextPatch.currentTrack?.refId ?? null,
        extra: { priorStoreIsPlaying: prior.isPlaying },
      });
    }
    const mirrorFieldsUnchanged =
      prior.currentTrack?.refId === nextPatch.currentTrack?.refId &&
      prior.queueIndex === nextPatch.queueIndex &&
      prior.isPlaying === nextPatch.isPlaying &&
      prior.isLoading === nextPatch.isLoading &&
      prior.error === nextPatch.error &&
      prior.volume === nextPatch.volume &&
      prior.muted === nextPatch.muted &&
      Math.abs(prior.duration - nextPatch.duration) < 0.001 &&
      Math.abs(prior.currentTime - nextPatch.currentTime) < 0.05 &&
      (sessionPatch?.detailsOpen === undefined || prior.detailsOpen === sessionPatch.detailsOpen) &&
      (sessionPatch?.hydrated === undefined || prior.hydrated === sessionPatch.hydrated);
    if (mirrorFieldsUnchanged) return;
    logStateSync(nextPatch);
    usePlaybackStore.setState(nextPatch);
    schedulePlaybackPersist();
  }

  clearOnStop(): void {
    clearPersistedPlayback();
  }

  hydratePausedSession(
    track: PlaybackItem,
    position: number,
    queue: PlaybackItem[],
    queueIndex: number,
  ): HydratedPausedSession {
    hydrationPipelineTrace({
      fn: "MediaSessionPersistence.hydratePausedSession",
      phase: "ENTER",
      persisted: {
        activeTrack: track.refId,
        queueLength: queue.length,
        queueIndex,
        currentTime: position,
        isPlaying: false,
      },
    });
    const result = {
      track: hydratePlaybackItem(track),
      queue: hydratePlaybackQueue(queue),
      queueIndex,
      position,
    };
    hydrationPipelineTrace({
      fn: "MediaSessionPersistence.hydratePausedSession",
      phase: "EXIT",
      hydrated: {
        activeTrack: result.track.refId,
        queueLength: result.queue.length,
        queueIndex: result.queueIndex,
        currentTime: result.position,
        isPlaying: false,
      },
    });
    return result;
  }

  hydrateQueue(queue: PlaybackItem[], queueIndex: number): { queue: PlaybackItem[]; queueIndex: number } {
    return {
      queue: hydratePlaybackQueue(queue),
      queueIndex,
    };
  }
}
