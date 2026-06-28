"use client";

import { extractSpotifyEmbedUrl } from "@/lib/music";
import { Button } from "@/components/ui/Button";

interface PlayerModalProps {
  title: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  onClose: () => void;
}

export function PlayerModal({ title, spotifyUrl, youtubeUrl, youtubeId, onClose }: PlayerModalProps) {
  const spotifyEmbed = spotifyUrl ? extractSpotifyEmbedUrl(spotifyUrl) : null;
  const ytId =
    youtubeId ??
    (youtubeUrl?.includes("watch?v=") ? youtubeUrl.split("v=")[1]?.split("&")[0] : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" role="dialog">
      <div className="w-full max-w-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-foreground">{title}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {spotifyEmbed && (
            <iframe
              src={spotifyEmbed}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`Spotify: ${title}`}
              className="border-0"
            />
          )}
          {ytId && (
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={`YouTube: ${title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          )}
          {!spotifyEmbed && !ytId && (
            <p className="text-sm text-muted">No embed available. Open streaming links from the artist page.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {spotifyUrl && (
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
              Open in Spotify
            </a>
          )}
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
              Open in YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
