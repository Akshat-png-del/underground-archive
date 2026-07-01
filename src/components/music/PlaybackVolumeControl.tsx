"use client";

import { useCallback, type MouseEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePlaybackStore } from "@/stores/playback-store";
import { setPlaybackVolume, togglePlaybackMute } from "@/lib/music/playback-actions";
import { resolvePlaybackSource } from "@/lib/music/playback-source";

function stopPointerBubble(e: { stopPropagation: () => void }): void {
  e.stopPropagation();
}

export function PlaybackVolumeControl() {
  const volume = usePlaybackStore((s) => s.volume);
  const muted = usePlaybackStore((s) => s.muted);
  const currentTrack = usePlaybackStore((s) => s.currentTrack);

  const sourceKind = currentTrack ? resolvePlaybackSource(currentTrack).kind : "none";
  const volumeSupported = sourceKind === "preview";

  const handleVolumeChange = useCallback((next: number) => {
    setPlaybackVolume(Math.max(0, Math.min(1, next)));
  }, []);

  const handleToggleMute = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!volumeSupported) return;
      togglePlaybackMute();
    },
    [volumeSupported],
  );

  if (!volumeSupported) {
    return (
      <div
        data-player-control
        className="player-volume flex items-center gap-2"
        title="Volume is controlled by Spotify"
        onPointerDown={stopPointerBubble}
        onClick={stopPointerBubble}
      >
        <button
          type="button"
          data-player-control
          disabled
          className="player-control-btn flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-muted opacity-50"
          aria-label="Volume controlled by Spotify"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-player-control
      className="player-volume flex items-center gap-2"
      onPointerDown={stopPointerBubble}
      onClick={stopPointerBubble}
    >
      <button
        type="button"
        data-player-control
        className="player-control-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated hover:text-accent"
        onClick={handleToggleMute}
        onPointerDown={stopPointerBubble}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        aria-label="Volume"
        className="player-volume-slider hidden w-24 sm:block"
        onPointerDown={stopPointerBubble}
        onPointerUp={stopPointerBubble}
        onInput={(e) => {
          stopPointerBubble(e);
          handleVolumeChange(Number((e.target as HTMLInputElement).value));
        }}
        onChange={(e) => {
          stopPointerBubble(e);
          handleVolumeChange(Number(e.target.value));
        }}
        onClick={stopPointerBubble}
      />
    </div>
  );
}
