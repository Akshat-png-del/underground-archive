"use client";

import type { ImageProps } from "next/image";
import type { Genre } from "@/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { resolveTrackArtwork } from "@/lib/music/track-artwork";
import { cn } from "@/lib/utils";

type TrackArtworkProps = Omit<ImageProps, "src" | "alt"> & {
  coverArt?: string | null;
  genres?: Genre[];
  alt?: string;
  wrapperClassName?: string;
};

/** Track/release artwork with Spotify URL first, genre placeholder on miss or load failure. */
export function TrackArtwork({
  coverArt,
  genres,
  alt = "",
  className,
  wrapperClassName,
  ...props
}: TrackArtworkProps) {
  const { src, fallbacks, fallbackSrc } = resolveTrackArtwork({ coverArt, genres });

  return (
    <SafeImage
      src={src}
      alt={alt}
      fallbacks={fallbacks}
      fallbackSrc={fallbackSrc}
      className={cn("object-cover", className)}
      wrapperClassName={wrapperClassName}
      {...props}
    />
  );
}
