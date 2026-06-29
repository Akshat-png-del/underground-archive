"use client";

import type { Artist } from "@/types";
import {
  resolveListeningPathHref,
  resolveListeningPathPlaybackItem,
} from "@/lib/artists/listening-path";
import { useCardPlayback } from "@/lib/music/use-card-playback";

function ListeningPathStep({
  artist,
  step,
  index,
}: {
  artist: Artist;
  step: Artist["listeningPath"][number];
  index: number;
}) {
  const playbackItem = resolveListeningPathPlaybackItem(artist, step);
  const refId = playbackItem?.refId ?? `${artist.slug}::${step.title}`;
  const type = playbackItem?.type ?? (step.type === "set" ? "set" : "track");
  const item = playbackItem ?? {
    type,
    refId,
    label: step.title,
    title: step.title,
    subtitle: artist.name,
  };

  const { handleCardPointerDown, active } = useCardPlayback(item, type, refId);

  return (
    <li>
      <div
        onPointerDown={(e) => {
          if (!playbackItem) return;
          handleCardPointerDown(e);
        }}
        className={`group flex cursor-pointer touch-manipulation gap-4 border p-3 transition-colors hover:border-accent ${
          active ? "border-accent bg-surface" : "border-border"
        }`}
        role="button"
        tabIndex={0}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent text-sm text-accent">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase text-muted">{step.type}</p>
          <p className="font-medium text-foreground transition-colors group-hover:text-accent">
            {step.title}
          </p>
          {step.note && <p className="text-sm text-muted">{step.note}</p>}
        </div>
      </div>
    </li>
  );
}

export function ListeningPath({ artist }: { artist: Artist }) {
  if (artist.listeningPath.length === 0) return null;

  return (
    <ol className="space-y-3">
      {artist.listeningPath.map((step, i) => (
        <ListeningPathStep key={`${step.type}-${step.title}-${i}`} artist={artist} step={step} index={i} />
      ))}
    </ol>
  );
}
