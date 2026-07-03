import type { PlaybackItem } from "@/lib/music/playback";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { extractYouTubeId } from "@/lib/music";
import type {
  PlaybackProvider,
  ProviderKind,
  ProviderPlayRequest,
  ProviderState,
  ProviderStateListener,
} from "@/lib/music/providers/playback-provider";
import { EMPTY_PROVIDER_STATE } from "@/lib/music/providers/playback-provider";
import { AudioProvider } from "@/lib/music/providers/audio-provider";
import { SpotifyProvider } from "@/lib/music/providers/spotify-provider";
import { YouTubeProvider } from "@/lib/music/providers/youtube-provider";
import {
  logProviderDestroy,
  logProviderLoad,
  logProviderSeek,
  logProviderState,
  logProviderSwitch,
} from "@/lib/music/providers/provider-debug";
import { seekPipelineTrace } from "@/lib/music/seek-pipeline-trace";
import { playPausePipelineTrace, isDuplicateCommand } from "@/lib/music/play-pause-pipeline-trace";
import {
  logProviderAttached,
  logProviderCreated,
  logProviderReady,
  logCommandQueued,
  logCommandExecuted,
  logPlaybackConfirmed,
} from "@/lib/music/media-binding-debug";
import {
  getProviderMountNode,
  waitForPlaybackMediaAnchor,
} from "@/lib/music/playback-media-anchor-registry";
import { syncAuditRecord } from "@/lib/music/playback-sync-audit";
import { volumePipelineTrace } from "@/lib/music/volume-pipeline-trace";
import { queuePipelineTrace } from "@/lib/music/queue-pipeline-trace";

function kindForItem(item: PlaybackItem): ProviderKind | "none" {
  const resolved = resolvePlaybackSource(item);
  if (resolved.kind === "preview") return "audio";
  if (resolved.kind === "spotify") return "spotify";
  if (resolved.kind === "youtube") return "youtube";
  return "none";
}

type QueuedCommand =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "seek"; positionSeconds: number };

export class ProviderRouter {
  private active: PlaybackProvider | null = null;
  private activeKind: ProviderKind | null = null;
  private listener: ProviderStateListener | null = null;
  private switching = false;
  private commandQueue: QueuedCommand[] = [];
  private latestPlayGeneration = 0;

  getActiveKind(): ProviderKind | null {
    return this.activeKind;
  }

  setStateListener(listener: ProviderStateListener | null): void {
    this.listener = listener;
    this.active?.setStateListener(listener ? (state) => this.emitState(state) : null);
  }

  private emitState(state: ProviderState): void {
    logProviderState(this.activeKind, state);
    syncAuditRecord({
      ts: Date.now(),
      action: "provider-tick",
      layer: "provider",
      currentTime: state.currentTime,
      duration: state.duration,
      isPlaying: state.isPlaying,
      volume: null,
      muted: null,
      isLoading: state.isLoading,
      currentTrack: null,
      extra: { kind: this.activeKind },
    });
    this.listener?.(state);
  }

  private bindProvider(provider: PlaybackProvider): void {
    provider.setStateListener((state) => this.emitState(state));
  }

  private isProviderCommandReady(): boolean {
    return !!this.active?.isReady && !this.switching;
  }

  private queueCommand(command: QueuedCommand): void {
    logCommandQueued(command.type, "positionSeconds" in command ? { positionSeconds: command.positionSeconds } : undefined);
    this.commandQueue.push(command);
  }

  private async flushCommandQueue(): Promise<void> {
    if (!this.isProviderCommandReady()) return;

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()!;
      if (!this.isProviderCommandReady()) {
        this.commandQueue.unshift(command);
        return;
      }

      switch (command.type) {
        case "pause":
          this.active?.pause();
          logCommandExecuted("pause");
          break;
        case "resume":
          this.active?.resume();
          logCommandExecuted("resume");
          break;
        case "seek":
          logProviderSeek(this.activeKind, command.positionSeconds);
          this.active?.seek(command.positionSeconds);
          logCommandExecuted("seek", { positionSeconds: command.positionSeconds });
          break;
      }
    }
  }

  private async teardownActiveAsync(): Promise<void> {
    if (!this.active) return;
    const dying = this.active;
    const kind = this.activeKind;
    logProviderDestroy(kind);
    dying.setStateListener(null);
    try {
      dying.stop();
    } catch {
      // ignore
    }
    try {
      dying.destroy();
    } catch {
      // ignore
    }
    this.active = null;
    this.activeKind = null;
    this.commandQueue = [];
    this.purgeStrayMedia();
  }

  private purgeStrayMedia(): void {
    const container = getProviderMountNode();
    if (!container) return;

    for (const host of container.querySelectorAll("[data-youtube-embed-host]")) {
      host.remove();
    }
    for (const host of container.querySelectorAll("[data-spotify-embed-host]")) {
      if (!this.active || this.activeKind !== "spotify") host.remove();
    }
    for (const audio of container.querySelectorAll("audio")) {
      if (!this.active || this.activeKind !== "audio") audio.remove();
    }
  }

  private createProvider(kind: ProviderKind): PlaybackProvider {
    switch (kind) {
      case "audio":
        return new AudioProvider();
      case "spotify":
        return new SpotifyProvider();
      case "youtube":
        return new YouTubeProvider();
    }
  }

  private buildPlayRequest(item: PlaybackItem, generation: number): ProviderPlayRequest | null {
    const resolved = resolvePlaybackSource(item);
    if (resolved.kind === "none" || !resolved.sourceUrl) return null;

    const videoId =
      resolved.kind === "youtube"
        ? (item.youtubeId ??
          extractYouTubeId(item.youtubeUrl ?? undefined) ??
          extractYouTubeId(resolved.sourceUrl))
        : null;

    return {
      item,
      sourceUrl: resolved.sourceUrl,
      videoId,
      generation,
    };
  }

  async play(item: PlaybackItem, generation: number): Promise<{ issue: string | null }> {
    this.latestPlayGeneration = generation;
    queuePipelineTrace({
      fn: "ProviderRouter.play",
      phase: "enter",
      targetActiveTrack: item.refId,
      providerKind: kindForItem(item),
      extra: { generation, activeKind: this.activeKind },
    });
    const isAborted = () => generation !== this.latestPlayGeneration;

    const kind = kindForItem(item);
    if (kind === "none") {
      await this.teardownActiveAsync();
      const resolved = resolvePlaybackSource(item);
      const issue = resolved.issue ?? `No playback source for "${item.title}"`;
      playbackDebugError("PROVIDER", `play failed — ${issue}`, {
        refId: item.refId,
        type: item.type,
        title: item.title,
      });
      return { issue };
    }

    let mount = getProviderMountNode();
    if (!mount) {
      try {
        mount = await waitForPlaybackMediaAnchor();
      } catch {
        const issue = "Playback media anchor not ready";
        playbackDebugError("PROVIDER", issue, item);
        return { issue };
      }
    }

    if (!mount.isConnected) {
      return { issue: "Playback media anchor disconnected" };
    }

    const from = this.activeKind;
    logProviderSwitch(from, kind, item.refId);
    await this.teardownActiveAsync();
    if (isAborted()) return { issue: null };

    const provider = this.createProvider(kind);
    logProviderCreated(kind);

    try {
      provider.attach(mount);
      await provider.init();
      logProviderAttached(kind, item.refId);

      this.active = provider;
      this.activeKind = kind;
      this.bindProvider(provider);

      const request = this.buildPlayRequest(item, generation);
      if (!request) {
        await this.teardownActiveAsync();
        return { issue: `No playback source for "${item.title}"` };
      }

      logProviderLoad(kind, item.refId, { sourceUrl: request.sourceUrl, generation });

      this.switching = true;
      try {
        await provider.load(request);
        if (isAborted()) return { issue: null };
        if (!provider.isReady) {
          await provider.waitUntilReady();
        }
        if (isAborted()) return { issue: null };
        logProviderReady(kind, item.refId);
        await provider.startPlayback();
        if (isAborted()) return { issue: null };
        logPlaybackConfirmed(kind, item.refId);
        queuePipelineTrace({
          fn: "ProviderRouter.play",
          phase: "playback_confirmed",
          targetActiveTrack: item.refId,
          providerKind: kind,
        });
      } finally {
        this.switching = false;
        if (!isAborted()) {
          await this.flushCommandQueue();
        }
      }
    } catch (err) {
      if (isAborted()) return { issue: null };
      return { issue: err instanceof Error ? err.message : String(err) };
    }

    return { issue: null };
  }

  pause(): void {
    const providerPlaying = this.active?.getState().isPlaying ?? null;
    playPausePipelineTrace({
      fn: "ProviderRouter.pause",
      phase: "ENTER",
      event: "pause",
      duplicateCommand: isDuplicateCommand("router-pause"),
      providerIsPlaying: providerPlaying,
      activeTrack: this.activeKind,
      extra: { commandReady: this.isProviderCommandReady(), switching: this.switching },
    });
    if (!this.isProviderCommandReady()) {
      this.queueCommand({ type: "pause" });
      playPausePipelineTrace({
        fn: "ProviderRouter.pause",
        phase: "QUEUED",
        event: "pause",
        note: "command queued — provider not ready",
      });
      return;
    }
    this.active?.pause();
    logCommandExecuted("pause");
    playPausePipelineTrace({
      fn: "ProviderRouter.pause",
      phase: "EXIT",
      event: "pause",
      providerIsPlaying: this.active?.getState().isPlaying ?? null,
      activeTrack: this.activeKind,
    });
  }

  resume(): void {
    const providerPlaying = this.active?.getState().isPlaying ?? null;
    playPausePipelineTrace({
      fn: "ProviderRouter.resume",
      phase: "ENTER",
      event: "resume",
      duplicateCommand: isDuplicateCommand("router-resume"),
      providerIsPlaying: providerPlaying,
      activeTrack: this.activeKind,
      extra: { commandReady: this.isProviderCommandReady(), switching: this.switching },
    });
    if (!this.isProviderCommandReady()) {
      this.queueCommand({ type: "resume" });
      playPausePipelineTrace({
        fn: "ProviderRouter.resume",
        phase: "QUEUED",
        event: "resume",
        note: "command queued — provider not ready",
      });
      return;
    }
    this.active?.resume();
    logCommandExecuted("resume");
    playPausePipelineTrace({
      fn: "ProviderRouter.resume",
      phase: "EXIT",
      event: "resume",
      providerIsPlaying: this.active?.getState().isPlaying ?? null,
      activeTrack: this.activeKind,
    });
  }

  async stop(): Promise<void> {
    this.commandQueue = [];
    await this.teardownActiveAsync();
  }

  seek(positionSeconds: number): void {
    seekPipelineTrace("ProviderRouter.seek", "ENTER", {
      positionSeconds,
      activeKind: this.activeKind,
      isReady: this.active?.isReady ?? false,
      switching: this.switching,
      commandReady: this.isProviderCommandReady(),
    });
    if (!this.isProviderCommandReady()) {
      seekPipelineTrace("ProviderRouter.seek", "EARLY_RETURN", {
        reason: "!isProviderCommandReady() — queuing command",
        isReady: this.active?.isReady ?? false,
        switching: this.switching,
      });
      this.queueCommand({ type: "seek", positionSeconds });
      seekPipelineTrace("ProviderRouter.seek", "EXIT", { queued: true });
      return;
    }
    seekPipelineTrace("ProviderRouter.seek", "INVOKE", {
      next: `active.seek(${this.activeKind})`,
      positionSeconds,
    });
    logProviderSeek(this.activeKind, positionSeconds);
    this.active?.seek(positionSeconds);
    logCommandExecuted("seek", { positionSeconds });
    seekPipelineTrace("ProviderRouter.seek", "EXIT", { positionSeconds, executed: true });
  }

  getState(): ProviderState {
    return this.active?.getState() ?? { ...EMPTY_PROVIDER_STATE };
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    const accepted = this.active instanceof AudioProvider;
    volumePipelineTrace({
      initiator: "ProviderRouter",
      fn: "ProviderRouter.setVolume",
      phase: accepted ? "forward_audio" : "skip_non_audio",
      newVolume: clamped,
      activeRouterKind: this.activeKind,
      providerAccepted: accepted,
      note: accepted ? undefined : "only AudioProvider receives setVolume",
    });
    if (this.active instanceof AudioProvider) {
      this.active.setVolume(clamped);
    }
  }

  setMuted(muted: boolean): void {
    const accepted = this.active instanceof AudioProvider;
    volumePipelineTrace({
      initiator: "ProviderRouter",
      fn: "ProviderRouter.setMuted",
      phase: accepted ? "forward_audio" : "skip_non_audio",
      newMuted: muted,
      activeRouterKind: this.activeKind,
      providerAccepted: accepted,
      note: accepted ? undefined : "only AudioProvider receives setMuted",
    });
    if (this.active instanceof AudioProvider) {
      this.active.setMuted(muted);
    }
  }

  destroy(): void {
    void this.teardownActiveAsync();
    this.listener = null;
  }
}
