"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";

interface PlayerModalProps {
  title: string;
  subtitle?: string;
  coverArt?: string;
  youtubeId?: string;
  detailsHref?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  onClose: () => void;
}

export function PlayerModal({
  title,
  subtitle,
  coverArt,
  youtubeId,
  detailsHref,
  spotifyUrl,
  youtubeUrl,
  onClose,
}: PlayerModalProps) {
  const thumb =
    coverArt ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-foreground">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        {thumb && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden border border-border">
            <SafeImage src={thumb} alt="" fill sizes="512px" className="object-cover" />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {detailsHref && (
            <Link
              href={detailsHref}
              className="text-sm text-accent underline-offset-4 hover:underline"
              onClick={onClose}
            >
              View details
            </Link>
          )}
          {spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              Open in Spotify
            </a>
          )}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              Open in YouTube
            </a>
          )}
          {youtubeId && !youtubeUrl && (
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              Open in YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
