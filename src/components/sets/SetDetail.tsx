"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { archiveSetToEssential } from "@/content/sets";
import { SetCardEmbed } from "@/components/artists/SetCard";
import { MusicActions } from "@/components/music/MusicActions";
import { usePlaybackStore } from "@/stores/playback-store";
import { playbackItemFromSet } from "@/lib/music/playback";
import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";
import { shouldRenderSetEmbed } from "@/lib/archive/verification";

export function SetDetail({ set, displayDate }: { set: ArchiveSet; displayDate: string }) {
  const { toggleSaveSet, isSetSaved } = useLibrary();
  const openDetails = usePlaybackStore((s) => s.openDetails);
  const play = usePlaybackStore((s) => s.play);
  const isActive = usePlaybackStore((s) => s.isActive);
  const saved = isSetSaved(set.id);

  const handleExpand = () => {
    if (!isActive("set", set.id)) {
      play(playbackItemFromSet(set));
    }
    openDetails();
  };

  const canShowEmbed = shouldRenderSetEmbed(set, set.artistId, set.artistSlug) && !!set.youtubeId;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-3">
        <MusicActions
          type="set"
          refId={set.id}
          label={`${set.title} — ${set.artistName}`}
          youtubeId={set.youtubeId}
        />
        <Button size="sm" variant="outline" onClick={handleExpand}>
          Expand
        </Button>
        <Button size="sm" variant="outline" onClick={() => toggleSaveSet(set.id)}>
          {saved ? "Saved" : "Save set"}
        </Button>
        <Link href={`/artists/${set.artistSlug}`}>
          <Button size="sm" variant="outline">View artist</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {set.bpm && (
          <div className="border border-border p-4">
            <p className="text-xs text-muted">BPM</p>
            <p className="mt-1 text-lg text-accent">{set.bpm}</p>
          </div>
        )}
        <div className="border border-border p-4">
          <p className="text-xs text-muted">Location</p>
          <p className="mt-1 text-sm">{set.location}</p>
        </div>
        <div className="border border-border p-4">
          <p className="text-xs text-muted">Date</p>
          <p className="mt-1 text-sm">{displayDate}</p>
        </div>
      </div>

      <div className="mt-10">
        {canShowEmbed ? (
          <SetCardEmbed
            set={archiveSetToEssential(set)}
            artistId={set.artistId}
            artistSlug={set.artistSlug}
            setId={set.id}
            setSlug={set.slug}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center border border-border bg-surface p-6 text-center">
            <p className="text-sm text-muted-light">No archived set available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
