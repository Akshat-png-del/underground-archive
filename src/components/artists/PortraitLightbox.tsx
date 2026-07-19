"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";

export interface PortraitLightboxData {
  src: string;
  fallbacks?: string[];
  alt: string;
}

interface PortraitLightboxProps {
  portrait: PortraitLightboxData;
  onClose: () => void;
}

export function PortraitLightbox({ portrait, onClose }: PortraitLightboxProps) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-[min(60vw,720px)] sm:w-[50vw] sm:min-w-[40vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="interactive-ghost absolute -right-1 -top-10 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface/90 text-muted-light backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-foreground sm:-right-3 sm:-top-3"
          aria-label="Close portrait preview"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(166,30,30,0.1)] ring-1 ring-accent/15"
        >
          <div className="flex w-full items-center justify-center bg-background">
            <SafeImage
              src={portrait.src}
              fallbacks={portrait.fallbacks}
              alt={portrait.alt}
              width={1200}
              height={1500}
              sizes="(max-width: 640px) 90vw, 50vw"
              className="!h-auto !max-h-[70vh] !w-full !object-contain sm:!max-h-[80vh]"
              wrapperClassName="!relative !flex !h-auto !w-full !items-center !justify-center !overflow-visible !bg-transparent"
            />
          </div>
        </div>

        <p id={titleId} className="mt-3 text-center font-serif text-lg text-foreground">
          {portrait.alt}
        </p>
      </div>
    </div>
  );
}
