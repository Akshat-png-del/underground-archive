"use client";

import type { ArchiveSet } from "@/types/library";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { playbackItemFromSet, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { setThumbnailUrl } from "@/lib/music/set-display";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import { useCardPlayback } from "@/lib/music/use-card-playback";

interface SetRowProps {
  set: ArchiveSet;
  variant?: "card" | "row";
  meta?: string;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
}

export function SetRow({ set, variant = "row", meta, browseQueue, browseIndex }: SetRowProps) {
  const item = playbackItemFromSet(set);
  const browse = browseQueue
    ? browseContextAt(browseQueue, item, browseIndex)
    : undefined;
  const { handleCardPointerDown, active, playing } = useCardPlayback(item, "set", set.id, browse, set.slug);
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const subtitle = meta ?? `${set.event} · ${set.date?.slice(0, 4) ?? ""}`.replace(/ · $/, "");

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardPointerDown(e as unknown as React.PointerEvent);
    }
  };

  const artwork = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-sm bg-background ${
        variant === "card" ? "h-20 w-28" : "h-14 w-20 sm:h-16 sm:w-24"
      }`}
    >
      <SafeImage
        src={setThumbnailUrl(set.thumbnail, set.youtubeId)}
        alt=""
        fill
        sizes="96px"
        className="object-cover"
      />
    </div>
  );

  const body = (
    <>
      {artwork}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{set.artistName}</p>
        <p className="truncate text-base text-foreground/90">{set.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {subtitle} · {genre} · {set.duration}
        </p>
      </div>
      {active && (
        <div className="shrink-0 self-center">
          <PlayingIndicator playing={playing} compact />
        </div>
      )}
    </>
  );

  const surfaceClass = `playable-surface group flex cursor-pointer touch-manipulation items-center gap-4 rounded-sm px-3 py-3 sm:px-4 ${playableSurfaceClass(active, playing)}`;

  return (
    <div
      onPointerDown={handleCardPointerDown}
      className={surfaceClass}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
      aria-current={active ? "true" : undefined}
      onKeyDown={handleCardKeyDown}
    >
      {body}
    </div>
  );
}
