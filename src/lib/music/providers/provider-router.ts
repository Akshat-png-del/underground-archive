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
import { playbackDebugError } from "@/lib/music/playback-debug";

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
  private volume = 1;
  private muted = false;
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
    await new Promise<void>((resolve) => {
      queueMicrotask(() => resolve());
    });
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
        return new AudioProvider(this.volume, this.muted);
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

    let mount: HTMLElement;
    try {
      mount = await waitForPlaybackMediaAnchor();
    } catch {
      const issue = "Playback media anchor not ready";
      playbackDebugError("PROVIDER", issue, item);
      return { issue };
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
        await provider.waitUntilReady();
        if (isAborted()) return { issue: null };
        logProviderReady(kind, item.refId);
        await provider.startPlayback();
        if (isAborted()) return { issue: null };
        logPlaybackConfirmed(kind, item.refId);
      } finally {
        this.switching = false;
        if (!isAborted()) {
          await this.flushCommandQueue();
        }
      }
    } catch (err) {
      if (isAborted()) return { issue: null };
      if (this.active === provider) {
        const message = err instanceof Error ? err.message : String(err);
        this.emitState({
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
          error: message,
        });
      }
      return { issue: err instanceof Error ? err.message : String(err) };
    }

    return { issue: null };
  }

  pause(): void {
    if (!this.isProviderCommandReady()) {
      this.queueCommand({ type: "pause" });
      return;
    }
    this.active?.pause();
    logCommandExecuted("pause");
  }

  resume(): void {
    if (!this.isProviderCommandReady()) {
      this.queueCommand({ type: "resume" });
      return;
    }
    this.active?.resume();
    logCommandExecuted("resume");
  }

  async stop(): Promise<void> {
    this.commandQueue = [];
    await this.teardownActiveAsync();
    this.emitState({ ...EMPTY_PROVIDER_STATE });
  }

  seek(positionSeconds: number): void {
    if (!this.isProviderCommandReady()) {
      this.queueCommand({ type: "seek", positionSeconds });
      return;
    }
    logProviderSeek(this.activeKind, positionSeconds);
    this.active?.seek(positionSeconds);
    logCommandExecuted("seek", { positionSeconds });
  }

  getState(): ProviderState {
    return this.active?.getState() ?? { ...EMPTY_PROVIDER_STATE };
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.active instanceof AudioProvider) {
      this.active.setVolume(this.volume);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.active instanceof AudioProvider) {
      this.active.setMuted(muted);
    }
  }

  destroy(): void {
    void this.teardownActiveAsync();
    this.listener = null;
  }
}
