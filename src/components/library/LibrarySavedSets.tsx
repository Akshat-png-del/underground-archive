"use client";

import Link from "next/link";
import { getSet, archiveSetToEssential } from "@/content/sets";
import { useLibrary } from "@/context/LibraryContext";
import { SetCardEmbed } from "@/components/artists/SetCard";
import { MusicActions } from "@/components/music/MusicActions";

export function LibrarySavedSets() {
  const { savedSets } = useLibrary();
  const sets = savedSets.map((id) => getSet(id)).filter(Boolean);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Saved Sets</h1>
      <p className="mt-2 text-muted-light">{sets.length} saved</p>
      {sets.length === 0 ? (
        <p className="mt-12 text-muted">Save live sets from artist pages or the sets directory.</p>
      ) : (
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {sets.map((set) => set && (
            <div key={set.id}>
              <Link href={`/sets/${set.slug}`} className="text-sm text-accent hover:underline">
                {set.artistName}
              </Link>
              <SetCardEmbed set={archiveSetToEssential(set)} artistId={set.artistId} />
              <div className="mt-2">
                <MusicActions
                  type="set"
                  refId={set.id}
                  label={`${set.title} — ${set.artistName}`}
                  youtubeId={set.youtubeId}
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
