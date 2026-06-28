"use client";

import Link from "next/link";
import {
  getMostDiscussedArtists,
  getMostLikedPlaylists,
  getMostSavedSets,
} from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SafeImage } from "@/components/ui/SafeImage";
import { SocialBadge } from "@/components/ui/SocialBadge";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";

export function CommunityFavoritesHub() {
  const playlists = getMostLikedPlaylists(3);
  const sets = getMostSavedSets(3);
  const artists = getMostDiscussedArtists(4);

  return (
    <FadeInSection>
      <HomeSection
        title="Community favorites"
        subtitle="Most liked playlists, most saved sets, and artists driving conversation."
        href="/library/playlists"
        variant="surface"
      >
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Playlists</h3>
              <SocialBadge variant="trending" />
            </div>
            <ul className="space-y-3">
              {playlists.map((p) => (
                <li key={p.id}>
                  <Link href={`/playlists/${p.id}`} className="card-editorial flex gap-3 border border-border p-3 hover-glow">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden">
                      <SafeImage src={p.coverImage} alt="" fill sizes="56px" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted">{p.creatorName} · {p.likeCount} likes</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted">Saved sets</h3>
            <ul className="space-y-3">
              {sets.map((set) => (
                <li key={set.id}>
                  <Link href={`/sets/${set.slug}`} className="card-editorial flex gap-3 border border-border p-3 hover-glow">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden">
                      <SafeImage src={set.thumbnail} alt="" fill sizes="96px" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{set.title}</p>
                      <p className="text-xs text-muted">{set.artistName}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Discussed artists</h3>
              <SocialBadge variant="rising" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {artists.map((a) => (
                <ArtistCard
                  key={a.slug}
                  slug={a.slug}
                  name={a.name}
                  portrait={a.portrait}
                  genres={a.genres}
                  city={a.city}
                />
              ))}
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
