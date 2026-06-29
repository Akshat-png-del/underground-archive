"use client";

import type { ArchiveSet } from "@/types/library";
import { setCategoryLabels } from "@/content/sets";
import { SetRow } from "@/components/music/SetRow";

export function SetsDirectoryGrid({ sets }: { sets: ArchiveSet[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sets.map((set) => (
        <div key={set.id} className="card-editorial border border-border">
          <SetRow
            set={set}
            variant="row"
            meta={`${setCategoryLabels[set.category]} · ${set.event}`}
          />
        </div>
      ))}
    </div>
  );
}
