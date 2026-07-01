"use client";

import type { ArchiveSet } from "@/types/library";
import { SafeImage } from "@/components/ui/SafeImage";
import { playItem } from "@/lib/music/playback-actions";
import { playbackItemFromSet } from "@/lib/music/playback";
import { setThumbnailUrl, canShowSetVideoEmbed } from "@/lib/music/set-display";
import { usePlaybackStore } from "@/stores/playback-store";
import { useSetWatchDock } from "@/components/sets/use-set-watch-dock";

interface SetWatchSurfaceProps {
  set: ArchiveSet;
}

/**
 * Primary YouTube interaction surface for /sets/[slug].
 * Native embed controls only — no custom transport.
 */
export function SetWatchSurface({ set }: SetWatchSurfaceProps) {
  const hostRef = useSetWatchDock(set);
  const active = usePlaybackStore((s) => s.isActive("set", set.id));
  const isLoading = usePlaybackStore((s) => s.isActive("set", set.id) && s.isLoading);
  const error = usePlaybackStore((s) => s.error);
  const canShowVideo = canShowSetVideoEmbed(set.youtubeId);

  if (!canShowVideo) {
    return (
      <section
        data-set-watch-surface
        className="set-watch-surface flex aspect-video w-full items-center justify-center rounded-sm bg-surface-elevated/60 p-6 text-center"
        aria-label="Set video unavailable"
      >
        <p className="text-sm text-muted-light">No archived set available.</p>
      </section>
    );
  }

  const showPoster = !active || (isLoading && !error);

  return (
    <section
      data-set-watch-surface
      className="set-watch-surface w-full overflow-hidden rounded-sm bg-black"
      aria-label={`Watch ${set.title}`}
    >
      <div className="set-watch-player relative aspect-video w-full bg-black">
        <div
          ref={hostRef}
          data-set-watch-host
          data-player-embed-host
          data-set-watch-active
          className="set-watch-host absolute inset-0 z-[2]"
        />

        {showPoster && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
            aria-hidden
          >
            <SafeImage
              src={setThumbnailUrl(set.thumbnail, set.youtubeId)}
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-background/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/90">
                {error ? "Playback error" : "Loading video…"}
              </span>
            </div>
          </div>
        )}

        {error && active && (
          <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-background/90 px-6 text-center">
            <p className="text-sm text-foreground">{error}</p>
            <button
              type="button"
              className="rounded-sm border border-border bg-surface px-4 py-2 text-sm text-accent hover:border-accent/50"
              onClick={() => playItem(playbackItemFromSet(set))}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
