"use client";

import { memo } from "react";
import { Bookmark } from "lucide-react";
import type { ArchiveSet } from "@/types/library";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { playbackItemFromSet, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { setThumbnailUrl } from "@/lib/music/set-display";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import {
  useCardPlayback,
  playbackItemActive,
  playbackItemPlaying,
} from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { useLibrary } from "@/context/LibraryContext";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";

interface SetRowProps {
  set: ArchiveSet;
  variant?: "card" | "row";
  meta?: string;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
}

export const SetRow = memo(function SetRow({
  set,
  variant = "row",
  meta,
  browseQueue,
  browseIndex,
}: SetRowProps) {
  const { isSetSaved, toggleSaveSet } = useLibrary();
  const requireAuth = useRequireLibraryAuth();
  const saved = isSetSaved(set.id);
  const item = playbackItemFromSet(set);
  const browse = browseQueue
    ? browseContextAt(browseQueue, item, browseIndex)
    : undefined;
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, "set", set.id);
  const playing = playbackItemPlaying(snapshot, "set", set.id);
  const { handleCardPointerDown, stopCardPointerDown } = useCardPlayback(
    item,
    "set",
    set.id,
    browse,
    set.slug,
  );
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const subtitle = meta ?? `${set.event} · ${set.date?.slice(0, 4) ?? ""}`.replace(/ · $/, "");
  const thumb = setThumbnailUrl(set.thumbnail, set.youtubeId);

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
      {thumb ? (
        <SafeImage
          src={thumb}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      ) : null}
    </div>
  );

  const body = (
    <>
      {artwork}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{set.artistName}</p>
        <p className="truncate text-base text-foreground/90">{set.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {subtitle} · {genre}
          {set.duration ? ` · ${set.duration}` : ""}
        </p>
      </div>
      {active && (
        <div className="shrink-0 self-center">
          <PlayingIndicator playing={playing} compact />
        </div>
      )}
      <button
        type="button"
        className="shrink-0 rounded-sm p-2 text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label={saved ? `Unsave ${set.title}` : `Save ${set.title}`}
        title={saved ? "Saved" : "Save set"}
        onPointerDown={stopCardPointerDown}
        onClick={(event) => {
          event.stopPropagation();
          if (!requireAuth()) return;
          toggleSaveSet(set.id);
        }}
      >
        <Bookmark className={`h-4 w-4 ${saved ? "fill-accent text-accent" : ""}`} />
      </button>
    </>
  );

  const surfaceClass = `playable-surface group flex w-full min-w-0 max-w-full cursor-pointer touch-manipulation items-center gap-4 rounded-sm px-3 py-3 sm:px-4 ${playableSurfaceClass(active, playing)}`;

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
});
