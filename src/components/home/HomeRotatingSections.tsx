"use client";

import { useEffect, useState } from "react";
import type { Artist } from "@/types";
import type { ArchiveSet } from "@/types/library";
import { getArtistOfWeek, getEssentialSetOfDay } from "@/content/home/feed";
import { ArtistOfWeekHero } from "@/components/home/ArtistOfWeekHero";
import { EssentialSetOfDayHero } from "@/components/home/EssentialSetOfDayHero";

export function ArtistOfWeekBlock({ initialArtist }: { initialArtist: Artist }) {
  const [artist, setArtist] = useState(initialArtist);

  useEffect(() => {
    setArtist(getArtistOfWeek());
  }, []);

  return <ArtistOfWeekHero artist={artist} />;
}

export function EssentialSetOfDayBlock({ initialSet }: { initialSet: ArchiveSet }) {
  const [set, setSet] = useState(initialSet);

  useEffect(() => {
    setSet(getEssentialSetOfDay());
  }, []);

  return <EssentialSetOfDayHero set={set} />;
}
