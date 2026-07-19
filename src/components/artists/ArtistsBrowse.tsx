"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Artist, Genre } from "@/types";
import { genreLabels } from "@/content/artists";
import { ArtistGrid } from "@/components/artists/ArtistGrid";

interface Props {
  artists: Artist[];
  genres: Genre[];
}

export function ArtistsBrowse({ artists, genres }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramGenre = searchParams.get("genre") as Genre | null;

  const [active, setActive] = useState<Genre | "all">(
    paramGenre && genres.includes(paramGenre) ? paramGenre : "all",
  );

  useEffect(() => {
    if (paramGenre && genres.includes(paramGenre)) {
      setActive(paramGenre);
    } else if (!paramGenre) {
      setActive("all");
    }
  }, [paramGenre, genres]);

  const filtered = useMemo(() => {
    if (active === "all") return artists;
    return artists.filter((a) => a.genres.includes(active));
  }, [artists, active]);

  function selectGenre(next: Genre | "all") {
    setActive(next);
    if (next === "all") {
      router.replace("/artists", { scroll: false });
    } else {
      router.replace(`/artists?genre=${next}`, { scroll: false });
    }
  }

  return (
    <>
      <nav aria-label="Filter by genre" className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectGenre("all")}
          aria-pressed={active === "all"}
          className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
            active === "all"
              ? "border-accent bg-accent text-foreground"
              : "border-border text-muted-light hover:border-accent/50 hover:text-foreground"
          }`}
        >
          All
        </button>
        {genres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => selectGenre(g)}
            aria-pressed={active === g}
            className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
              active === g
                ? "border-accent bg-accent text-foreground"
                : "border-border text-muted-light hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {genreLabels[g]}
          </button>
        ))}
      </nav>

      <div className="mt-10">
        <ArtistGrid artists={filtered} />
      </div>
    </>
  );
}
