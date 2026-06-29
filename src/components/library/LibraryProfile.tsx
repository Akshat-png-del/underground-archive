"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { Button } from "@/components/ui/Button";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { SafeImage } from "@/components/ui/SafeImage";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { TodaysDiscovery, PreferencesSummary } from "@/components/home/TodaysDiscovery";

export function LibraryProfile() {
  const { profile, updateProfile, publicPlaylists, history, playlists, recentlyViewed } = useLibrary();
  const { openCreatePlaylist } = usePlaylistModal();

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Profile</h1>
      <p className="mt-2 text-muted-light">Your underground archive identity.</p>

      <div className="mt-8 space-y-4 border border-border p-6">
        <div>
          <label className="text-sm text-muted">Display name</label>
          <input
            className="mt-1 w-full border border-border bg-background px-3 py-2 text-foreground"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted">Bio</label>
          <textarea
            className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
            rows={3}
            value={profile.bio}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            placeholder="What sounds define your archive?"
          />
        </div>
      </div>

      <PreferencesSummary />

      <section className="mt-12">
        <TodaysDiscovery compact />
      </section>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div className="border border-border p-5">
          <p className="text-3xl font-serif text-accent">{playlists.length}</p>
          <p className="text-sm text-muted">Your playlists</p>
          <Button className="mt-4" size="sm" onClick={openCreatePlaylist}>Create playlist</Button>
        </div>
        <div className="border border-border p-5">
          <p className="text-3xl font-serif text-accent">{history.length}</p>
          <p className="text-sm text-muted">Recently played</p>
          <Link href="/library/history" className="mt-4 inline-block text-sm text-accent hover:underline">View history →</Link>
        </div>
      </div>

      {recentlyViewed.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-foreground">Recently viewed</h2>
          <ul className="mt-4 space-y-2">
            {recentlyViewed.slice(0, 8).map((v) => (
              <li key={v.id}>
                <Link href={v.href} className="interactive-row flex items-center gap-3 border border-border p-3">
                  <div className="relative h-10 w-10 shrink-0">
                    <TrackArtwork coverArt={v.coverArt} alt="" fill sizes="40px" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.title}</p>
                    <p className="text-xs text-muted">{v.subtitle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-foreground">Continue listening</h2>
          <ul className="mt-4 space-y-2">
            {history.slice(0, 5).map((h) => (
              <li key={h.id}>
                <HistoryPlayRow entry={h} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-serif text-xl text-foreground">Trending public playlists</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {publicPlaylists.slice(0, 4).map((p) => (
            <Link key={p.id} href={`/playlists/${p.id}`} className="interactive-row flex gap-3 border border-border p-3">
              <div className="relative h-16 w-16 shrink-0">
                <SafeImage src={p.coverImage} alt="" fill sizes="64px" />
              </div>
              <div>
                <p className="font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted">{p.creatorName} · {p.items.length} items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
