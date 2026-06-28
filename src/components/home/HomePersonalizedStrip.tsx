"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { getRecentlyAddedTracks } from "@/content/home/feed";
import { SafeImage } from "@/components/ui/SafeImage";
import { TrackRow } from "@/components/music/TrackRow";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";

export function HomePersonalizedStrip() {
  const { history, recentlyViewed, savedSets, ready } = useLibrary();
  const recentTracks = getRecentlyAddedTracks(4);

  if (!ready) return null;
  const hasActivity = history.length > 0 || recentlyViewed.length > 0 || savedSets.length > 0;
  if (!hasActivity) return null;

  return (
    <FadeInSection>
      <HomeSection title="Your feed" subtitle="Pick up where you left off." badge="For you">
        <div className="grid gap-8 lg:grid-cols-2">
          {history.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Continue listening</h3>
              <ul className="mt-4 space-y-2">
                {history.slice(0, 4).map((h) => (
                  <li key={h.id} className="card-editorial flex items-center gap-3 border border-border p-3">
                    <div className="relative h-10 w-10 shrink-0">
                      <SafeImage src={h.coverArt} alt="" fill sizes="40px" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{h.title}</p>
                      <p className="text-xs text-muted">{h.subtitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recentlyViewed.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Recently viewed</h3>
              <ul className="mt-4 space-y-2">
                {recentlyViewed.slice(0, 4).map((v) => (
                  <li key={v.id}>
                    <Link href={v.href} className="card-editorial flex items-center gap-3 border border-border p-3 hover-glow">
                      <div className="relative h-10 w-10 shrink-0">
                        <SafeImage src={v.coverArt} alt="" fill sizes="40px" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.title}</p>
                        <p className="text-xs text-muted">{v.subtitle}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {savedSets.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Saved sets</h3>
              <p className="mt-2 text-sm text-muted">
                <Link href="/library/sets" className="text-accent hover:underline">
                  {savedSets.length} sets in your library →
                </Link>
              </p>
            </div>
          )}

          <div className="lg:col-span-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Recently added tracks</h3>
            <ol className="mt-4 space-y-2">
              {recentTracks.slice(0, 3).map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} />
              ))}
            </ol>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
