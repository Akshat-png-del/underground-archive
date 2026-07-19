"use client";

import { memo, useMemo } from "react";
import type { ImageProps } from "next/image";
import type { Genre } from "@/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { resolveTrackArtwork } from "@/lib/music/track-artwork";
import { cn } from "@/lib/utils";

type TrackArtworkProps = Omit<ImageProps, "src" | "alt"> & {
  coverArt?: string | null;
  genres?: Genre[];
  artistSlug?: string | null;
  alt?: string;
  wrapperClassName?: string;
};

/** Track/release artwork — Spotify cover, else verified artist portrait. */
export const TrackArtwork = memo(function TrackArtwork({
  coverArt,
  genres,
  artistSlug,
  alt = "",
  className,
  wrapperClassName,
  ...props
}: TrackArtworkProps) {
  const resolved = useMemo(
    () => resolveTrackArtwork({ coverArt, genres, artistSlug }),
    [coverArt, genres, artistSlug],
  );

  return (
    <SafeImage
      src={resolved.src}
      alt={alt}
      fallbacks={resolved.fallbacks}
      fallbackSrc={resolved.fallbackSrc}
      className={cn("object-cover", className)}
      wrapperClassName={wrapperClassName}
      {...props}
    />
  );
});
