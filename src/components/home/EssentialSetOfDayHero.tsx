"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { MusicActions } from "@/components/music/MusicActions";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";
import { playbackItemFromSet } from "@/lib/music/playback";
import { useCardPlayback, youtubeDisplayEmbedUrl } from "@/lib/music/use-card-playback";

interface Props {
  set: ArchiveSet;
}

export function EssentialSetOfDayHero({ set }: Props) {
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const item = playbackItemFromSet(set);
  const { handleCardPointerDown, stopCardPointerDown, active, playing } = useCardPlayback(
    item,
    "set",
    set.id,
  );

  return (
    <FadeInSection>
      <HomeSection
        title="Essential set of the day"
        subtitle="Rotates every 12 hours · One performance worth your full attention."
        badge="Today"
        href={`/sets/${set.slug}`}
        linkLabel="Full set page"
        variant="surface"
      >
        <div
          onPointerDown={handleCardPointerDown}
          className={`card-editorial cursor-pointer touch-manipulation overflow-hidden border border-border bg-surface-elevated lg:grid lg:grid-cols-5 ${
            active ? "ring-2 ring-accent" : ""
          }`}
          role="button"
          tabIndex={0}
          aria-label={playing ? `Pause ${set.title}` : `Play ${set.title}`}
        >
          <div className="group relative aspect-video w-full lg:col-span-3 lg:aspect-auto lg:min-h-[320px]">
            {set.youtubeId ? (
              <iframe
                src={youtubeDisplayEmbedUrl(set.youtubeId)}
                title={set.title}
                className="pointer-events-none absolute inset-0 h-full w-full border-0"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
                tabIndex={-1}
              />
            ) : (
              <SafeImage src={set.thumbnail} alt="" fill sizes="(max-width:1024px) 100vw, 60vw" className="image-zoom" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{set.event}</p>
            <p className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{set.artistName}</p>
            <p className="mt-2 text-lg text-muted-light">{set.title}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted">Duration</dt>
                <dd className="mt-1 text-foreground">{set.duration}</dd>
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
            <div className="mt-8 flex flex-wrap gap-3" onPointerDown={stopCardPointerDown}>
              <MusicActions
                type="set"
                refId={set.id}
                label={`${set.title} — ${set.artistName}`}
                youtubeId={set.youtubeId}
              />
              <Link href={`/artists/${set.artistSlug}`}>
                <Button variant="outline" size="sm">
                  View artist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
