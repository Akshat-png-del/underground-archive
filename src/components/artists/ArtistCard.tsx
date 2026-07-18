"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import type { Artist } from "@/types";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  resolvePortrait,
  resolvePortraitFallbacksForDisplay,
} from "@/lib/archive/verification";
import { isPlaceholderArtwork } from "@/lib/library/resolve-display";
import { Tag } from "@/components/ui/ArchivePrimitives";

interface ArtistCardProps {
  artist: Pick<Artist, "slug" | "name" | "portrait" | "heroImage" | "genres" | "city" | "image" | "spotifyArtistId">;
  /** First cards in a carousel may request priority for snappier paint. */
  priority?: boolean;
}

export const ArtistCard = memo(function ArtistCard({ artist, priority }: ArtistCardProps) {
  const imageSrc = resolvePortrait(artist);
  const fallbacks = useMemo(
    () => resolvePortraitFallbacksForDisplay(artist).filter((url) => !isPlaceholderArtwork(url)),
    // artist identity fields that affect portrait resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artist.slug, artist.portrait, artist.spotifyArtistId, artist.image?.url],
  );
  const hasPortrait = !isPlaceholderArtwork(imageSrc) || fallbacks.length > 0;
  const src = isPlaceholderArtwork(imageSrc) ? fallbacks[0] : imageSrc;
  const restFallbacks = isPlaceholderArtwork(imageSrc) ? fallbacks.slice(1) : fallbacks;

  return (
    <Link href={`/artists/${artist.slug}`} className="group block cursor-pointer">
      <div className="card-editorial overflow-hidden border border-border bg-surface hover-glow hover:border-accent/40">
        <div className="relative aspect-[4/5] w-full bg-surface">
          {hasPortrait && src ? (
            <SafeImage
              src={src}
              fallbacks={restFallbacks}
              alt={artist.name}
              fill
              priority={priority}
              className="w-full"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="font-serif text-xl text-foreground transition-colors group-hover:text-accent">
            {artist.name}
          </h3>
          <p className="mt-1 text-sm text-muted">{artist.city}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {artist.genres.slice(0, 2).map((g) => (
              <Tag key={g}>{genreLabels[g] || g}</Tag>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
});
