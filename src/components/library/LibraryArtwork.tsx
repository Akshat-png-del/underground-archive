"use client";

import { memo } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { isPlaceholderArtwork } from "@/lib/library/resolve-display";
import { cn } from "@/lib/utils";

type LibraryArtworkProps = {
  src?: string | null;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  wrapperClassName?: string;
  priority?: boolean;
};

/**
 * Library media art — renders any verified URL (Spotify OR YouTube set stills).
 * Never routes through TrackArtwork / isGenericArtworkFallback (which strips YouTube).
 * Hides completely when src is missing or placeholder.
 */
export const LibraryArtwork = memo(function LibraryArtwork({
  src,
  alt = "",
  fill,
  sizes,
  className,
  wrapperClassName,
  priority,
}: LibraryArtworkProps) {
  if (isPlaceholderArtwork(src)) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-surface",
          wrapperClassName,
          fill && "h-full w-full",
        )}
        aria-hidden
      />
    );
  }

  return (
    <SafeImage
      src={src!}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      wrapperClassName={wrapperClassName}
      hidePlaceholder
      priority={priority}
    />
  );
});
