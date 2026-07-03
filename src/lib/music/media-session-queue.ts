import type { PlaybackItem, PlaybackBrowseContext } from "@/lib/music/playback";
import { isSamePlaybackItem } from "@/lib/music/playback";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";

export type MediaSessionQueueState = {
  queue: PlaybackItem[];
  queueIndex: number;
};

export const EMPTY_MEDIA_SESSION_QUEUE: MediaSessionQueueState = {
  queue: [],
  queueIndex: 0,
};

export type QueueBrowseOptions = {
  queue?: PlaybackItem[];
  queueIndex?: number;
  browse?: PlaybackBrowseContext;
};

export function resolveBrowseSession(
  item: PlaybackItem,
  options?: QueueBrowseOptions,
): MediaSessionQueueState {
  const queue = options?.browse?.queue ?? options?.queue;
  const explicitIndex = options?.browse?.queueIndex ?? options?.queueIndex;

  if (queue && queue.length > 0) {
    const queueIndex =
      explicitIndex !== undefined && explicitIndex >= 0 && explicitIndex < queue.length
        ? explicitIndex
        : queue.findIndex((entry) => isSamePlaybackItem(entry, item));
    return { queue, queueIndex: queueIndex >= 0 ? queueIndex : 0 };
  }

  return { queue: [item], queueIndex: 0 };
}

export function isExplicitQueueNavigation(
  explicitIndex: number | undefined,
  currentQueueIndex: number,
): boolean {
  return explicitIndex !== undefined && explicitIndex !== currentQueueIndex;
}

export function reconcileQueueIndex(
  queue: PlaybackItem[],
  priorQueueIndex: number,
  track: PlaybackItem | null,
  trackChanged: boolean,
): number {
  if (!trackChanged || !track) return priorQueueIndex;
  const matched = queue.findIndex((entry) => isSamePlaybackItem(entry, track));
  return matched >= 0 ? matched : priorQueueIndex;
}

export type QueueNavigationTarget = {
  item: PlaybackItem;
  queueIndex: number;
};

export function resolveNextQueueTarget(
  queue: PlaybackItem[],
  queueIndex: number,
): QueueNavigationTarget | null {
  const nextIndex = queueIndex + 1;
  if (nextIndex >= queue.length) return null;
  const item = queue[nextIndex];
  if (!item) return null;
  return { item, queueIndex: nextIndex };
}

export function resolvePreviousQueueTarget(
  queue: PlaybackItem[],
  queueIndex: number,
): QueueNavigationTarget | null {
  const prevIndex = queueIndex - 1;
  if (prevIndex < 0) return null;
  const item = queue[prevIndex];
  if (!item) return null;
  return { item, queueIndex: prevIndex };
}

export type AdvanceOnEndResult =
  | { kind: "end" }
  | { kind: "advance"; target: QueueNavigationTarget };

export function resolveAdvanceOnEnd(
  queue: PlaybackItem[],
  queueIndex: number,
): AdvanceOnEndResult {
  const target = resolveNextQueueTarget(queue, queueIndex);
  if (!target) return { kind: "end" };
  return { kind: "advance", target };
}

export class MediaSessionQueueSession {
  private state: MediaSessionQueueState = { ...EMPTY_MEDIA_SESSION_QUEUE };

  getState(): MediaSessionQueueState {
    return this.state;
  }

  reset(): void {
    this.state = { ...EMPTY_MEDIA_SESSION_QUEUE };
  }

  setQueue(queue: PlaybackItem[], queueIndex: number): void {
    queuePipelineTrace({
      fn: "MediaSessionQueueSession.setQueue",
      phase: "applied",
      queueLength: queue.length,
      currentQueueIndex: queueIndex,
      targetQueueIndex: queueIndex,
    });
    this.state = { queue, queueIndex };
  }

  applyQueueIndex(queueIndex: number): void {
    queuePipelineTrace({
      fn: "MediaSessionQueueSession.applyQueueIndex",
      phase: "applied",
      currentQueueIndex: this.state.queueIndex,
      targetQueueIndex: queueIndex,
      queueReconciledIndex: queueIndex,
    });
    this.state = { ...this.state, queueIndex };
  }
}
