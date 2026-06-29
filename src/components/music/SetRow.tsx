"use client";

import type { ArchiveSet } from "@/types/library";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { MusicActions } from "@/components/music/MusicActions";
import { playbackItemFromSet } from "@/lib/music/playback";
import { useCardPlayback, youtubeDisplayEmbedUrl } from "@/lib/music/use-card-playback";

interface SetRowProps {
  set: ArchiveSet;
  variant?: "card" | "row";
  showActions?: boolean;
  meta?: string;
}

export function SetRow({ set, variant = "card", showActions = false, meta }: SetRowProps) {
  const item = playbackItemFromSet(set);
  const { handleCardPointerDown, stopCardPointerDown, active, playing } = useCardPlayback(
    item,
    "set",
    set.id,
  );
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const subtitle = meta ?? `${set.artistName} · ${set.event}`;
  const hasVideo = !!set.youtubeId;

  const artwork = (
    <div
      className={`relative shrink-0 overflow-hidden ${
        variant === "card" ? "h-20 w-28" : "h-20 w-32"
      }`}
    >
      {hasVideo ? (
        <iframe
          src={youtubeDisplayEmbedUrl(set.youtubeId)}
          title={set.title}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
          tabIndex={-1}
        />
      ) : (
        <SafeImage src={set.thumbnail} alt="" fill sizes="128px" className={variant === "card" ? "image-zoom" : ""} />
      )}
    </div>
  );

  const body = (
    <>
      {artwork}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{set.title}</p>
        <p className="text-sm text-muted">{variant === "card" ? set.artistName : subtitle}</p>
        <p className="text-xs text-muted-light">
          {variant === "card" ? `${genre} · ${set.duration}` : `${genre} · ${set.duration}`}
        </p>
        {showActions && (
          <div className="mt-2" onPointerDown={stopCardPointerDown}>
            <MusicActions
              type="set"
              refId={set.id}
              label={`${set.title} — ${set.artistName}`}
              youtubeId={set.youtubeId}
              compact
            />
          </div>
        )}
      </div>
    </>
  );

  if (variant === "row") {
    return (
      <div
        onPointerDown={handleCardPointerDown}
        className={`interactive-row group flex cursor-pointer touch-manipulation gap-4 border p-4 transition-colors ${
          active ? "border-accent bg-surface" : "border-border"
        }`}
        role="button"
        tabIndex={0}
        aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      onPointerDown={handleCardPointerDown}
      className={`card-editorial group flex cursor-pointer touch-manipulation gap-4 border p-4 transition-colors ${
        active ? "border-accent bg-surface" : "border-border hover-glow"
      }`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
    >
      {body}
    </div>
  );
}
