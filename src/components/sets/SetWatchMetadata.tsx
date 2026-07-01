"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { setCategoryLabels } from "@/content/sets";
import { genreLabels } from "@/content/artists";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Heart, Share2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { setThumbnailUrl } from "@/lib/music/set-display";

interface SetWatchMetadataProps {
  set: ArchiveSet;
  displayDate: string;
}

export function SetWatchMetadata({ set, displayDate }: SetWatchMetadataProps) {
  const { toggleSaveSet, toggleLikeSet, isSetSaved, isSetLiked } = useLibrary();
  const saved = isSetSaved(set.id);
  const liked = isSetLiked(set.id);
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "Techno";
  const category = setCategoryLabels[set.category];

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title: `${set.title} — ${set.artistName}`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="set-watch-metadata mt-6 sm:mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{category}</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-5xl">
        {set.title}
      </h1>
      <p className="mt-3 text-lg text-foreground sm:text-xl">
        <Link href={`/artists/${set.artistSlug}`} className="hover:text-accent">
          {set.artistName}
        </Link>
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <div>
          <dt className="sr-only">Venue</dt>
          <dd>{set.event}</dd>
        </div>
        <div>
          <dt className="sr-only">Location</dt>
          <dd>{set.location}</dd>
        </div>
        <div>
          <dt className="sr-only">Date</dt>
          <dd>{displayDate}</dd>
        </div>
        <div>
          <dt className="sr-only">Duration</dt>
          <dd>{set.duration}</dd>
        </div>
        <div>
          <dt className="sr-only">Genre</dt>
          <dd>{genre}</dd>
        </div>
        {set.bpm && (
          <div>
            <dt className="sr-only">BPM</dt>
            <dd>{set.bpm} BPM</dd>
          </div>
        )}
      </dl>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-light sm:text-base">
        {set.event} performance by {set.artistName} — {set.location}. Archived from {category}.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => toggleSaveSet(set.id)}>
          {saved ? "Saved" : "Save set"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => toggleLikeSet(set.id)}>
          <Heart className={`mr-1.5 h-4 w-4 ${liked ? "fill-accent text-accent" : ""}`} />
          {liked ? "Liked" : "Like"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleShare} aria-label="Share set">
          <Share2 className="mr-1.5 h-4 w-4" />
          Share
        </Button>
        <Link href={`/artists/${set.artistSlug}`}>
          <Button size="sm" variant="ghost">
            View artist
          </Button>
        </Link>
      </div>
    </div>
  );
}
