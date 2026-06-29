"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { getTodaysDiscovery, getTodaysDiscoveryStatic, type DailyDiscovery } from "@/lib/preferences/recommendations";
import { DEFAULT_PREFERENCES } from "@/types/preferences";
import { genreLabels, moodLabels } from "@/content/artists";
import { resolvePortrait, resolvePortraitFallbacksForDisplay } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { MusicActions } from "@/components/music/MusicActions";
import { playbackItemFromTrack, playbackItemFromSet } from "@/lib/music/playback";
import { useCardPlayback, youtubeDisplayEmbedUrl } from "@/lib/music/use-card-playback";
import { FadeInSection } from "@/components/ui/FadeInSection";

interface Props {
  compact?: boolean;
}

export function TodaysDiscovery({
  compact,
  initialDiscovery,
}: Props & { initialDiscovery?: DailyDiscovery }) {
  const { preferences, ready } = usePreferences();
  const [discovery, setDiscovery] = useState<DailyDiscovery>(
    () => initialDiscovery ?? getTodaysDiscoveryStatic(DEFAULT_PREFERENCES),
  );

  useEffect(() => {
    if (!ready) return;
    setDiscovery(getTodaysDiscovery(preferences));
  }, [preferences, ready]);

  const { artist, set, track } = discovery;

  const setItem = playbackItemFromSet(set);
  const trackItem = playbackItemFromTrack(track);
  const {
    handleCardPointerDown: handleSetCard,
    stopCardPointerDown: stopSetCard,
    playing: setPlaying,
  } = useCardPlayback(setItem, "set", set.id);
  const {
    handleCardPointerDown: handleTrackCard,
    stopCardPointerDown: stopTrackCard,
    playing: trackPlaying,
  } = useCardPlayback(trackItem, "track", track.id);

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
                  fallbacks={resolvePortraitFallbacksForDisplay(artist)}
                  alt=""
                  fill
                  sizes="140px"
                  className="image-zoom"
                />
              </div>
              <p className="mt-4 font-serif text-xl text-foreground group-hover:text-accent">{artist.name}</p>
              <p className="text-xs text-muted">{artist.city} · {genreLabels[artist.genres[0]]}</p>
            </Link>

            <div
              onPointerDown={handleSetCard}
              className="card-editorial cursor-pointer touch-manipulation border border-border bg-background/60 p-5 hover-glow"
              role="button"
              tabIndex={0}
              aria-label={setPlaying ? `Pause ${set.title}` : `Play ${set.title}`}
            >
              <p className="font-mono text-[10px] uppercase text-muted">Set</p>
              <div className="relative mt-3 block aspect-video w-full overflow-hidden">
                {set.youtubeId ? (
                  <iframe
                    src={youtubeDisplayEmbedUrl(set.youtubeId)}
                    title={set.title}
                    className="pointer-events-none absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                    tabIndex={-1}
                  />
                ) : (
                  <SafeImage src={set.thumbnail} alt="" fill sizes="33vw" className="image-zoom" />
                )}
              </div>
              <p className="mt-4 font-medium text-foreground">{set.title}</p>
              <p className="text-xs text-muted">{set.artistName} · {set.duration}</p>
              <div className="mt-4" onPointerDown={stopSetCard}>
                <MusicActions type="set" refId={set.id} label={`${set.title} — ${set.artistName}`} youtubeId={set.youtubeId} compact />
              </div>
            </div>

            <div
              onPointerDown={handleTrackCard}
              className="card-editorial cursor-pointer touch-manipulation border border-border bg-background/60 p-5 hover-glow"
              role="button"
              tabIndex={0}
              aria-label={trackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            >
              <p className="font-mono text-[10px] uppercase text-muted">Track</p>
              <div className="relative mt-3 block h-24 w-24 overflow-hidden">
                <TrackArtwork coverArt={track.coverArt} genres={artist.genres} alt="" fill sizes="96px" />
              </div>
              <p className="mt-4 font-medium text-foreground">{track.title}</p>
              <p className="text-xs text-muted">{track.artist}</p>
              <div className="mt-4" onPointerDown={stopTrackCard}>
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
