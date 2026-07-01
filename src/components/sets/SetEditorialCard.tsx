"use client";

import type { ArchiveSet } from "@/types/library";
import { setCategoryLabels } from "@/content/sets";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { playbackItemFromSet } from "@/lib/music/playback";
import { setThumbnailUrl } from "@/lib/music/set-display";
import { useCardPlayback } from "@/lib/music/use-card-playback";
import Link from "next/link";

interface SetEditorialCardProps {
  set: ArchiveSet;
}

export function SetEditorialCard({ set }: SetEditorialCardProps) {
  const item = playbackItemFromSet(set);
  const { handleCardPointerDown, active, playing } = useCardPlayback(item, "set", set.id, undefined, set.slug);
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const year = set.date?.slice(0, 4) ?? "—";

  return (
    <article
      onPointerDown={handleCardPointerDown}
      className={`card-editorial group cursor-pointer touch-manipulation overflow-hidden rounded-xl border bg-surface transition-all ${
        active ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-accent/50"
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
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[5/3]">
        <SafeImage
          src={setThumbnailUrl(set.thumbnail, set.youtubeId)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="image-zoom object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            {setCategoryLabels[set.category]}
          </p>
          <h2 className="mt-2 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            {set.artistName}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted-light sm:text-base">{set.title}</p>
        </div>
        {playing && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-wider text-accent backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent live-pulse" />
            Playing
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-border px-5 py-4 text-xs sm:px-6">
        <div>
          <p className="text-muted">Event</p>
          <p className="mt-0.5 truncate font-medium text-foreground">{set.event}</p>
        </div>
        <div>
          <p className="text-muted">Year</p>
          <p className="mt-0.5 font-medium text-foreground">{year}</p>
        </div>
        <div>
          <p className="text-muted">Genre</p>
          <p className="mt-0.5 truncate font-medium text-foreground">{genre}</p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 sm:px-6">
        <Link
          href={`/sets/${set.slug}`}
          className="text-xs text-accent underline-offset-4 hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          View set details
        </Link>
      </div>
    </article>
  );
}
