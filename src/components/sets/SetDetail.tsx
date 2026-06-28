"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { archiveSetToEssential } from "@/content/sets";
import { SetCardEmbed } from "@/components/artists/SetCard";
import { MediaUnavailable } from "@/components/archive/MediaUnavailable";
import { shouldRenderSetEmbed } from "@/lib/archive/verification";
import { MusicActions } from "@/components/music/MusicActions";
import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";

export function SetDetail({ set }: { set: ArchiveSet }) {
  const { toggleSaveSet, isSetSaved } = useLibrary();
  const saved = isSetSaved(set.id);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-3">
        <MusicActions
          type="set"
          refId={set.id}
          label={`${set.title} — ${set.artistName}`}
          youtubeId={set.youtubeId}
        />
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
          <p className="mt-1 text-sm">{new Date(set.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-10">
        {shouldRenderSetEmbed(set, set.artistId, set.artistSlug) ? (
          <SetCardEmbed
            set={archiveSetToEssential(set)}
            artistId={set.artistId}
            artistSlug={set.artistSlug}
          />
        ) : (
          <MediaUnavailable />
        )}
      </div>
    </div>
  );
}
