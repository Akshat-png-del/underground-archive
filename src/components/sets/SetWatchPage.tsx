"use client";

import Link from "next/link";
import type { ArchiveSet } from "@/types/library";
import { SetWatchSurface } from "@/components/sets/SetWatchSurface";
import { SetWatchMetadata } from "@/components/sets/SetWatchMetadata";
import { SetWatchRelated } from "@/components/sets/SetWatchRelated";

interface SetWatchPageProps {
  set: ArchiveSet;
  displayDate: string;
}

/**
 * Dedicated video watch experience for /sets/[slug].
 * The page is the player — not the bottom audio bar.
 */
export function SetWatchPage({ set, displayDate }: SetWatchPageProps) {
  return (
    <div className="set-watch-page" data-set-watch-page>
      <Link href="/sets" className="text-sm text-accent hover:underline">
        ← All sets
      </Link>

      <div className="set-watch-layout mt-6">
        <SetWatchSurface set={set} />
        <SetWatchMetadata set={set} displayDate={displayDate} />
        <SetWatchRelated set={set} />
      </div>
    </div>
  );
}
