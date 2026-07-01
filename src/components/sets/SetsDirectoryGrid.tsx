"use client";

import type { ArchiveSet } from "@/types/library";
import { SetEditorialCard } from "@/components/sets/SetEditorialCard";

export function SetsDirectoryGrid({ sets }: { sets: ArchiveSet[] }) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      {sets.map((set) => (
        <SetEditorialCard key={set.id} set={set} />
      ))}
    </div>
  );
}
