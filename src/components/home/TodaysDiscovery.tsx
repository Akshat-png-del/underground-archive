"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { getTodaysDiscovery, getTodaysDiscoveryStatic, type DailyDiscovery } from "@/lib/preferences/recommendations";
import { getHomepageDiscovery, getHomepageDiscoveryStatic } from "@/content/home/feed";
import { DEFAULT_PREFERENCES } from "@/types/preferences";
import { genreLabels, moodLabels } from "@/content/artists";
import { resolvePortrait, resolvePortraitFallbacksForDisplay } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { TrackRow } from "@/components/music/TrackRow";
import { SetRow } from "@/components/music/SetRow";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

interface Props {
  compact?: boolean;
}

export function TodaysDiscovery({
  compact,
  initialDiscovery,
}: Props & { initialDiscovery?: DailyDiscovery }) {
  const { preferences, ready } = usePreferences();
  const useBudget = !!initialDiscovery && !compact;
  const budgeted = useHomepageRotationRefresh(
    getHomepageDiscovery,
    initialDiscovery ?? getHomepageDiscoveryStatic(),
  );
  const [personal, setPersonal] = useState<DailyDiscovery>(
    () => initialDiscovery ?? getTodaysDiscoveryStatic(DEFAULT_PREFERENCES),
  );

  useEffect(() => {
    if (useBudget) return;
    if (!ready) return;
    setPersonal(getTodaysDiscovery(preferences));
  }, [preferences, ready, useBudget]);

  const discovery = useBudget ? budgeted : personal;
  const { artist, set, track } = discovery;

  if (compact) {
    return (
      <div className="border border-border bg-surface-elevated p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Today&apos;s discovery</p>
        <p className="mt-2 font-serif text-xl text-foreground">{artist.name}</p>
        <p className="text-sm text-muted">{track.title} · {set.event}</p>
        <Link href="/" className="mt-3 inline-block text-sm text-accent hover:underline">
          See full picks →
        </Link>
      </div>
    );
  }

  return (
    <FadeInSection>
      <section className="border-t border-accent/20 bg-accent-glow px-4 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Today&apos;s discovery</p>
          <h2 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">Picked for your taste</h2>
          <p className="mt-2 text-sm text-muted-light">
            {preferences.completedAt ? "Based on your preferences" : "Complete onboarding to personalize"}
          </p>

          <div className="mt-8 space-y-2">
            <Link
              href={`/artists/${artist.slug}`}
              className="mb-4 inline-flex items-center gap-3 rounded-sm border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-accent/40"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
                <SafeImage
                  src={resolvePortrait(artist)}
                  fallbacks={resolvePortraitFallbacksForDisplay(artist)}
                  alt=""
                  fill
                  sizes="48px"
                />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-muted">Featured artist</p>
                <p className="font-serif text-lg text-foreground">{artist.name}</p>
              </div>
            </Link>
            <SetRow set={set} />
            <TrackRow track={track} />
          </div>
        </div>
      </section>
    </FadeInSection>
  );
}

export function PreferencesSummary() {
  const { preferences } = usePreferences();
  if (!preferences.completedAt) return null;

  return (
    <div className="mt-8 border border-border p-5">
      <h2 className="font-serif text-xl text-foreground">Your taste profile</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Genres</dt>
          <dd>{preferences.favoriteGenres.map((g) => genreLabels[g]).join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">BPM range</dt>
          <dd>{preferences.bpmRange[0]}–{preferences.bpmRange[1]}</dd>
        </div>
        <div>
          <dt className="text-muted">Moods</dt>
          <dd>{preferences.favoriteMoods.map((m) => moodLabels[m]).join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Artists</dt>
          <dd>{preferences.favoriteArtists.length} saved favorites</dd>
        </div>
      </dl>
    </div>
  );
}
