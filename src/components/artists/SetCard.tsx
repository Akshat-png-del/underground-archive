"use client";

import type { EssentialSet } from "@/types";
import { getSet } from "@/content/sets";
import { Tag } from "@/components/ui/ArchivePrimitives";
import { SafeImage } from "@/components/ui/SafeImage";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { playbackItemFromSet, playbackItemFromMusicActions, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { canShowSetVideoEmbed, setThumbnailUrl } from "@/lib/music/set-display";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import { useCardPlayback } from "@/lib/music/use-card-playback";

interface SetCardProps {
  set: EssentialSet;
  artistId: string;
  artistSlug?: string;
  setId?: string;
  setSlug?: string;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
}

export function SetCardEmbed({
  set,
  artistId,
  artistSlug,
  setId,
  setSlug,
  browseQueue,
  browseIndex,
}: SetCardProps) {
  const slug = artistSlug ?? artistId;
  const refId = setId ?? `${artistId}::${set.title}`;
  const hasVideo = canShowSetVideoEmbed(set.youtubeId);

  const playbackItem = (() => {
    if (setId) {
      const archiveSet = getSet(setId);
      if (archiveSet) return playbackItemFromSet(archiveSet);
    }
    return playbackItemFromMusicActions({
      type: "set",
      refId,
      label: `${set.title} — ${set.venue}`,
      youtubeId: set.youtubeId,
    });
  })();

  const browse = browseQueue ? browseContextAt(browseQueue, playbackItem, browseIndex) : undefined;
  const { handleCardPointerDown, active, playing } = useCardPlayback(
    playbackItem,
    "set",
    refId,
    browse,
    setSlug ?? getSet(setId ?? refId)?.slug,
  );

  if (!hasVideo) {
    return (
      <div className="border border-border bg-surface">
        <div className="flex aspect-video items-center justify-center border-b border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-light">No archived set available.</p>
        </div>
        <div className="p-4">
          <Tag>{set.venue}</Tag>
          <h3 className="mt-2 font-serif text-lg text-foreground">{set.title}</h3>
          <p className="mt-1 text-xs text-muted">{set.year}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={handleCardPointerDown}
      className={`cursor-pointer touch-manipulation overflow-hidden rounded-sm bg-surface transition-colors ${playableSurfaceClass(active, playing)} ${
        active ? "ring-1 ring-accent/50" : ""
      }`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardPointerDown(e as unknown as React.PointerEvent);
        }
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden sm:min-h-[360px] lg:min-h-[420px]">
        <SafeImage
          src={setThumbnailUrl(undefined, set.youtubeId)}
          alt=""
          fill
          sizes="(max-width:768px) 100vw, 900px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <Tag>{set.venue}</Tag>
          {active && <PlayingIndicator playing={playing} compact />}
        </div>
        <p className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">{set.title}</p>
        <p className="mt-2 text-sm text-muted">{set.year}</p>
      </div>
    </div>
  );
}
