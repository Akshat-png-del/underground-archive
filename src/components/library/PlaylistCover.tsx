"use client";

import { useMemo } from "react";
import type { Playlist } from "@/types/library";
import { SafeImage } from "@/components/ui/SafeImage";
import { playlistCoverCandidates } from "@/lib/library/resolve-display";
import { cn } from "@/lib/utils";

type PlaylistCoverProps = {
  playlist: Playlist;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  wrapperClassName?: string;
  priority?: boolean;
};

/**
 * Playlist card/hero artwork with track-art fallbacks.
 * Never renders a blank or placeholder image box when no valid URL exists.
 */
export function PlaylistCover({
  playlist,
  alt = "",
  fill,
  sizes,
  className,
  wrapperClassName,
  priority,
}: PlaylistCoverProps) {
  const candidates = useMemo(() => playlistCoverCandidates(playlist), [playlist]);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <SafeImage
      src={candidates[0]}
      fallbacks={candidates.slice(1)}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      wrapperClassName={cn(wrapperClassName)}
      hidePlaceholder
      priority={priority}
    />
  );
}
