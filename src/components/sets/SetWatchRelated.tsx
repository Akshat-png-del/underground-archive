"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { setCategoryLabels } from "@/content/sets";
import { SafeImage } from "@/components/ui/SafeImage";
import { setThumbnailUrl } from "@/lib/music/set-display";
import { getMoreSetsByArtist, getRelatedSets } from "@/lib/sets/related-sets";

interface SetWatchRelatedProps {
  set: ArchiveSet;
}

function RelatedSetLink({ set }: { set: ArchiveSet }) {
  return (
    <Link
      href={`/sets/${set.slug}`}
      className="group flex gap-3 rounded-sm border border-border/60 bg-surface-elevated/40 p-2 transition-colors hover:border-accent/40 hover:bg-surface-elevated"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm bg-background sm:h-20 sm:w-36">
        <SafeImage
          src={setThumbnailUrl(set.thumbnail, set.youtubeId)}
          alt=""
          fill
          sizes="144px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
          {setCategoryLabels[set.category]}
        </p>
        <p className="mt-1 truncate font-medium text-foreground">{set.title}</p>
        <p className="truncate text-sm text-muted">{set.artistName}</p>
      </div>
    </Link>
  );
}

export function SetWatchRelated({ set }: SetWatchRelatedProps) {
  const moreByArtist = getMoreSetsByArtist(set);
  const related = getRelatedSets(set).filter(
    (candidate) => !moreByArtist.some((entry) => entry.id === candidate.id),
  );

  return (
    <div className="set-watch-related mt-12 border-t border-border pt-10 sm:mt-16">
      {moreByArtist.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl text-foreground">More from {set.artistName}</h2>
          <p className="mt-1 text-sm text-muted">More sets by this artist</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moreByArtist.map((entry) => (
              <RelatedSetLink key={entry.id} set={entry} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-foreground">Related sets</h2>
          <p className="mt-1 text-sm text-muted">Similar performances you may like</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => (
              <RelatedSetLink key={entry.id} set={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
