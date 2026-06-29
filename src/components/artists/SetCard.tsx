"use client";

import type { EssentialSet } from "@/types";
import { getSet } from "@/content/sets";
import { shouldRenderSetEmbed } from "@/lib/archive/verification";
import { Tag } from "@/components/ui/ArchivePrimitives";
import { playbackItemFromSet, playbackItemFromMusicActions } from "@/lib/music/playback";
import { useCardPlayback, youtubeDisplayEmbedUrl } from "@/lib/music/use-card-playback";

interface SetCardProps {
  set: EssentialSet;
  artistId: string;
  artistSlug?: string;
  setId?: string;
  setSlug?: string;
}

export function SetCardEmbed({ set, artistId, artistSlug, setId, setSlug }: SetCardProps) {
  const slug = artistSlug ?? artistId;
  const showEmbed = shouldRenderSetEmbed(set, artistId, slug);
  const refId = setId ?? `${artistId}::${set.title}`;

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

  const { handleCardPointerDown, active, playing } = useCardPlayback(playbackItem, "set", refId);

  if (!showEmbed || !set.youtubeId) {
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
      className={`cursor-pointer touch-manipulation border bg-surface transition-colors ${
        active ? "border-accent" : "border-border"
      }`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <iframe
          src={youtubeDisplayEmbedUrl(set.youtubeId)}
          title={set.title}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
          tabIndex={-1}
        />
      </div>
      <div className="p-4">
        <Tag>{set.venue}</Tag>
        <p className="mt-2 font-serif text-lg text-foreground">{set.title}</p>
        <p className="mt-1 text-xs text-muted">{set.year}</p>
      </div>
    </div>
  );
}
