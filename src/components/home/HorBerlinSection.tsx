"use client";

import { useMemo } from "react";
import type { ArchiveSet } from "@/types/library";
import { getHorBerlinSection } from "@/content/home/feed";
import { SetRow } from "@/components/music/SetRow";
import { playbackItemFromSet } from "@/lib/music/playback";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

interface Props {
  initialSets: ArchiveSet[];
}

export function HorBerlinSection({ initialSets }: Props) {
  const sets = useHomepageRotationRefresh(() => getHorBerlinSection(6), initialSets);
  const browseQueue = useMemo(() => sets.map(playbackItemFromSet), [sets]);

  if (sets.length === 0) return null;

  return (
    <FadeInSection>
      <HomeSection title="HÖR Berlin" badge="Live Archive" href="/sets" linkLabel="Archive" variant="surface">
        <HomeCarousel>
          {sets.map((set, i) => (
            <CarouselItem key={set.id}>
              <SetRow
                set={set}
                variant="card"
                meta={`${set.duration ?? "—"} · ${set.date.slice(0, 4)}`}
                browseQueue={browseQueue}
                browseIndex={i}
              />
            </CarouselItem>
          ))}
        </HomeCarousel>
      </HomeSection>
    </FadeInSection>
  );
}
