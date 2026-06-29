"use client";

import type { ReactNode } from "react";
import { usePortraitLightbox } from "@/context/PortraitLightboxContext";

interface ArtistPortraitTriggerProps {
  src: string;
  fallbacks?: string[];
  alt: string;
  className?: string;
  children: ReactNode;
}

export function ArtistPortraitTrigger({
  src,
  fallbacks,
  alt,
  className,
  children,
}: ArtistPortraitTriggerProps) {
  const { openPortrait } = usePortraitLightbox();

  return (
    <button
      type="button"
      className={className}
      onClick={() => openPortrait({ src, fallbacks, alt })}
      aria-label={`View ${alt} portrait`}
    >
      {children}
    </button>
  );
}
