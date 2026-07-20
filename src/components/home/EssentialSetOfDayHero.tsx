"use client";

import type { ArchiveSet } from "@/types/library";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";
import { playbackItemFromSet } from "@/lib/music/playback";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import { setThumbnailUrl } from "@/lib/music/set-display";
import {
  useCardPlayback,
  playbackItemActive,
  playbackItemPlaying,
} from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

interface Props {
  set: ArchiveSet;
}

export function EssentialSetOfDayHero({ set }: Props) {
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const item = playbackItemFromSet(set);
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, "set", set.id);
  const playing = playbackItemPlaying(snapshot, "set", set.id);
  const { handleCardPointerDown } = useCardPlayback(
    item,
    "set",
    set.id,
    undefined,
    set.slug,
  );

  return (
    <FadeInSection>
      <HomeSection
        title="Today's Selection"
        href={`/sets/${set.slug}`}
        linkLabel="View set"
        variant="surface"
      >
        <div
          onPointerDown={handleCardPointerDown}
          className={`overflow-hidden rounded-sm bg-surface-elevated lg:grid lg:grid-cols-5 ${playableSurfaceClass(active, playing)} ${
            active ? "ring-1 ring-accent/40" : "border border-border/60"
          }`}
          role="button"
          tabIndex={0}
          aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
        >
          <div className="group relative aspect-video w-full lg:col-span-3 lg:aspect-auto lg:min-h-[320px]">
            <SafeImage
              src={setThumbnailUrl(set.thumbnail, set.youtubeId)}
              alt=""
              fill
              priority
              sizes="(max-width:1024px) 100vw, 60vw"
              className="image-zoom"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{set.event}</p>
            <p className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{set.artistName}</p>
            <p className="mt-2 text-lg text-muted-light">{set.title}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted">Duration</dt>
                <dd className="mt-1 text-foreground">{set.duration ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Genre</dt>
                <dd className="mt-1 text-foreground">{genre}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Location</dt>
                <dd className="mt-1 text-foreground">{set.location}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Energy</dt>
                <dd className="mt-1 text-accent">{set.energy ?? "—"}/10</dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {active && <PlayingIndicator playing={playing} />}
              <Button variant="outline" size="sm" href={`/artists/${set.artistSlug}`}>
                View artist
              </Button>
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
