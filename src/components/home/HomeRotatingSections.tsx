"use client";

import type { Artist } from "@/types";
import type { ArchiveSet } from "@/types/library";
import { getArtistOfWeek, getEssentialSetOfDay } from "@/content/home/feed";
import { ArtistOfWeekHero } from "@/components/home/ArtistOfWeekHero";
import { EssentialSetOfDayHero } from "@/components/home/EssentialSetOfDayHero";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

export function ArtistOfWeekBlock({ initialArtist }: { initialArtist: Artist }) {
  const artist = useHomepageRotationRefresh(getArtistOfWeek, initialArtist);
  return <ArtistOfWeekHero artist={artist} />;
}

export function EssentialSetOfDayBlock({ initialSet }: { initialSet: ArchiveSet }) {
  const set = useHomepageRotationRefresh(getEssentialSetOfDay, initialSet);
  return <EssentialSetOfDayHero set={set} />;
}
