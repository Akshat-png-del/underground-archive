"use client";

import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";
import { getTodaysDiscovery } from "@/lib/preferences/recommendations";
import { genreLabels, moodLabels } from "@/content/artists";
import { resolvePortrait, resolvePortraitFallbacks } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { MusicActions } from "@/components/music/MusicActions";
import { FadeInSection } from "@/components/ui/FadeInSection";

interface Props {
  compact?: boolean;
}

export function TodaysDiscovery({ compact }: Props) {
  const { preferences } = usePreferences();
  const { artist, set, track } = getTodaysDiscovery(preferences);

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
            Refreshes every 12 hours
            {preferences.completedAt ? " · based on your preferences" : " · complete onboarding to personalize"}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link href={`/artists/${artist.slug}`} className="card-editorial group border border-border bg-background/60 p-5 hover-glow">
              <p className="font-mono text-[10px] uppercase text-muted">Artist</p>
              <div className="relative mt-3 aspect-square w-full max-w-[140px] overflow-hidden">
                <SafeImage
                  src={resolvePortrait(artist)}
                  fallbacks={resolvePortraitFallbacks(artist).slice(1)}
                  alt=""
                  fill
                  sizes="140px"
                  className="image-zoom"
                />
              </div>
              <p className="mt-4 font-serif text-xl text-foreground group-hover:text-accent">{artist.name}</p>
              <p className="text-xs text-muted">{artist.city} · {genreLabels[artist.genres[0]]}</p>
            </Link>

            <Link href={`/sets/${set.slug}`} className="card-editorial group border border-border bg-background/60 p-5 hover-glow">
              <p className="font-mono text-[10px] uppercase text-muted">Set</p>
              <div className="relative mt-3 aspect-video overflow-hidden">
                <SafeImage src={set.thumbnail} alt="" fill sizes="33vw" className="image-zoom" />
              </div>
              <p className="mt-4 font-medium text-foreground group-hover:text-accent">{set.title}</p>
              <p className="text-xs text-muted">{set.artistName} · {set.duration}</p>
            </Link>

            <div className="card-editorial border border-border bg-background/60 p-5 hover-glow">
              <p className="font-mono text-[10px] uppercase text-muted">Track</p>
              <div className="relative mt-3 h-24 w-24 overflow-hidden">
                <SafeImage src={track.coverArt} alt="" fill sizes="96px" />
              </div>
              <p className="mt-4 font-medium text-foreground">{track.title}</p>
              <p className="text-xs text-muted">{track.artist}</p>
              <div className="mt-4">
                <MusicActions type="track" refId={track.id} label={`${track.title} — ${track.artist}`} spotifyUrl={track.spotifyUrl} compact />
              </div>
            </div>
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
