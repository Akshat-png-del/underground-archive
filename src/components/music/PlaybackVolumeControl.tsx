"use client";

import type { MouseEvent } from "react";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { mediaSessionController } from "@/lib/music/media-session-controller";
import { resolvePlaybackSource } from "@/lib/music/playback-source";
import { BarIcons } from "@/components/music/PlaybackBarIcons";

export function PlaybackVolumeControl() {
  const snapshot = useFinalPlaybackSnapshot();
  const { activeTrack, muted, volume } = snapshot;

  const source = activeTrack ? resolvePlaybackSource(activeTrack) : null;
  const volumeSupported = source?.kind === "preview";
  const spotifyActive = source?.kind === "spotify";

  if (!volumeSupported) {
    return (
      <div
        className="player-volume flex items-center gap-2"
        title={spotifyActive ? "Volume is controlled by Spotify" : "Volume unavailable"}
      >
        <button
          type="button"
          disabled
          className="player-control-btn spotify-btn spotify-btn--icon flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-muted opacity-50"
          aria-label={spotifyActive ? "Volume controlled by Spotify" : "Volume unavailable"}
        >
          <BarIcons.Volume />
        </button>
      </div>
    );
  }

  return (
    <div className="player-volume spotify-player-interactive flex items-center gap-2">
      <button
        type="button"
        data-player-control
        className="player-control-btn spotify-btn spotify-btn--icon flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated hover:text-accent"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          e.stopPropagation();
          mediaSessionController.toggleMute();
        }}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
      >
        {muted || volume === 0 ? <BarIcons.VolumeMuted /> : <BarIcons.Volume />}
      </button>
      <input
        type="range"
        data-player-control
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        aria-label="Volume"
        className="player-volume-slider spotify-volume-slider hidden w-24 cursor-pointer sm:block"
        onChange={(e) => {
          e.stopPropagation();
          mediaSessionController.setVolume(Number(e.target.value));
        }}
        onInput={(e) => {
          e.stopPropagation();
          mediaSessionController.setVolume(Number((e.target as HTMLInputElement).value));
        }}
      />
    </div>
  );
}
