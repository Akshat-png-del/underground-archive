"use client";

import { useRouter } from "next/navigation";
import type { SetCategory } from "@/types/library";
import { setCategoryLabels } from "@/content/sets";

interface Props {
  collections: SetCategory[];
}

export function BestSetsSelect({ collections }: Props) {
  const router = useRouter();

  return (
    <div className="mt-6 max-w-md">
      <label htmlFor="best-sets" className="sr-only">
        Best sets
      </label>
      <select
        id="best-sets"
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;
          router.push(`/sets/collections/${value}`);
        }}
        className="w-full cursor-pointer appearance-none border border-border bg-background bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors hover:border-muted focus:border-accent"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        }}
      >
        <option value="" disabled>
          Best sets…
        </option>
        {collections.map((c) => (
          <option key={c} value={c}>
            Best {setCategoryLabels[c]} Sets
          </option>
        ))}
      </select>
    </div>
  );
}
