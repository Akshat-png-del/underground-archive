"use client";

import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { ArtistPortraitTrigger } from "@/components/artists/ArtistPortraitTrigger";

interface ArtistProfilePortraitProps {
  src: string;
  fallbacks?: string[];
  name: string;
  className?: string;
  sizes?: string;
}

export function ArtistProfilePortrait({
  src,
  fallbacks,
  name,
  className,
  sizes = "144px",
}: ArtistProfilePortraitProps) {
  return (
    <ArtistPortraitTrigger
      src={src}
      fallbacks={fallbacks}
      alt={name}
      className={cn(
        "relative block h-full w-full overflow-hidden border border-border transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className,
      )}
    >
      <SafeImage src={src} fallbacks={fallbacks} alt={name} fill sizes={sizes} />
    </ArtistPortraitTrigger>
  );
}
