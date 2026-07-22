"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  getMostDiscussedArtists,
  getMostLikedPlaylists,
  getMostSavedSets,
} from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SetRow } from "@/components/music/SetRow";
import { playbackItemFromSet } from "@/lib/music/playback";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { SocialBadge } from "@/components/ui/SocialBadge";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";
import type { Artist } from "@/types";
import type { ArchiveSet } from "@/types/library";

export function CommunityFavoritesHub({
  initialArtists,
  initialSets,
}: {
  initialArtists?: Artist[];
  initialSets?: ArchiveSet[];
}) {
  const playlists = getMostLikedPlaylists(24);
  const artists = useHomepageRotationRefresh(
    () => getMostDiscussedArtists(4),
    initialArtists ?? getMostDiscussedArtists(4),
  );
  const sets = useHomepageRotationRefresh(
    () => getMostSavedSets(3),
    initialSets ?? getMostSavedSets(3),
  );
  const setBrowseQueue = useMemo(() => sets.map(playbackItemFromSet), [sets]);

  return (
    <FadeInSection>
      <HomeSection
        title="Community favorites"
        subtitle="Most liked playlists, most saved sets, and artists driving conversation."
        href="/community"
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
                      <PlaylistCover playlist={p} fill sizes="56px" />
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
              {sets.map((set, i) => (
                <li key={set.id}>
                  <SetRow set={set} variant="row" browseQueue={setBrowseQueue} browseIndex={i} />
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
                <ArtistCard key={a.slug} artist={a} />
              ))}
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
