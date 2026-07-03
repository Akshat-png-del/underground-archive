import { clampPlaybackPosition } from "@/lib/music/audio-transport-sync";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";

/** Presentation-only scrub/hover state — not provider transport. */
export type MediaSessionUiState = {
  isSeeking: boolean;
  seekPreviewTime: number | null;
  hoverPreviewTime: number | null;
};

export const EMPTY_MEDIA_SESSION_UI: MediaSessionUiState = {
  isSeeking: false,
  seekPreviewTime: null,
  hoverPreviewTime: null,
};

export function clampSeekTarget(seconds: number, duration: number): number {
  return duration > 0 ? clampPlaybackPosition(seconds, duration) : Math.max(0, seconds);
}

/** Display position for progress UI — drag preview, then hover preview, then transport time. */
export function mediaSessionDisplayTime(
  currentTime: number,
  ui: MediaSessionUiState,
): number {
  if (ui.isSeeking && ui.seekPreviewTime !== null) {
    return ui.seekPreviewTime;
  }
  if (!ui.isSeeking && ui.hoverPreviewTime !== null) {
    return ui.hoverPreviewTime;
  }
  return currentTime;
}

export function holdsTransportTimeDuringScrub(ui: MediaSessionUiState): boolean {
  return ui.isSeeking && ui.seekPreviewTime !== null;
}

export function reconcileUiFromEngine(
  prior: MediaSessionUiState,
  acceptPosition: boolean,
  pendingSeekSeconds: number | null,
): MediaSessionUiState {
  let isSeeking = prior.isSeeking;
  let seekPreviewTime = prior.seekPreviewTime;

  if (prior.isSeeking && acceptPosition && pendingSeekSeconds === null) {
    isSeeking = false;
    seekPreviewTime = null;
  }

  return {
    isSeeking,
    seekPreviewTime,
    hoverPreviewTime: prior.isSeeking ? null : prior.hoverPreviewTime,
  };
}

export class MediaSessionUiSession {
  private state: MediaSessionUiState = { ...EMPTY_MEDIA_SESSION_UI };

  getState(): MediaSessionUiState {
    return this.state;
  }

  reset(): void {
    this.state = { ...EMPTY_MEDIA_SESSION_UI };
  }

  clearHoverPreview(): boolean {
    if (this.state.hoverPreviewTime === null) return false;
    this.state = { ...this.state, hoverPreviewTime: null };
    return true;
  }

  beginSeek(seconds: number, duration: number): MediaSessionUiState {
    seekPipelineTrace("MediaSessionUiSession.beginSeek", "ENTER", { seconds, duration });
    const target = clampSeekTarget(seconds, duration);
    this.state = { isSeeking: true, seekPreviewTime: target, hoverPreviewTime: null };
    seekPipelineTrace("MediaSessionUiSession.beginSeek", "EXIT", { state: this.state });
    return this.state;
  }

  updateSeek(seconds: number, duration: number): MediaSessionUiState | null {
    seekPipelineTrace("MediaSessionUiSession.updateSeek", "ENTER", {
      seconds,
      duration,
      isSeeking: this.state.isSeeking,
    });
    if (!this.state.isSeeking) {
      seekPipelineTrace("MediaSessionUiSession.updateSeek", "EARLY_RETURN", {
        reason: "state.isSeeking === false",
      });
      return null;
    }
    this.state = { ...this.state, seekPreviewTime: clampSeekTarget(seconds, duration) };
    seekPipelineTrace("MediaSessionUiSession.updateSeek", "EXIT", { state: this.state });
    return this.state;
  }

  setHoverPreview(seconds: number, duration: number): MediaSessionUiState | null {
    if (this.state.isSeeking || duration <= 0) return null;
    const target = clampSeekTarget(seconds, duration);
    if (this.state.hoverPreviewTime === target) return null;
    this.state = { ...this.state, hoverPreviewTime: target };
    return this.state;
  }

  clearOnSeekCommit(): MediaSessionUiState {
    seekPipelineTrace("MediaSessionUiSession.clearOnSeekCommit", "ENTER", { prior: this.state });
    this.state = { ...EMPTY_MEDIA_SESSION_UI };
    seekPipelineTrace("MediaSessionUiSession.clearOnSeekCommit", "EXIT", { state: this.state });
    return this.state;
  }

  applyReconciled(next: MediaSessionUiState): void {
    this.state = next;
  }
}
