"use client";

import type { ArchiveSet } from "@/types/library";
import { SetsDirectoryGrid } from "@/components/sets/SetsDirectoryGrid";

interface Props {
  sets: ArchiveSet[];
}

export function SetsArchiveBrowser({ sets }: Props) {
  return (
    <div className="mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {sets.length} set{sets.length === 1 ? "" : "s"}
      </p>

      {sets.length === 0 ? (
        <p className="mt-10 border border-border px-5 py-10 text-center text-sm text-muted-light">
          No sets yet.
        </p>
      ) : (
        <div className="mt-6">
          <SetsDirectoryGrid sets={sets} />
        </div>
      )}
    </div>
  );
}
