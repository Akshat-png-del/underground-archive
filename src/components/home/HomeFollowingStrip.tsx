"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { getArtist } from "@/content/artists";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { Button } from "@/components/ui/Button";

export function HomeFollowingStrip() {
  const { followedArtists, savedArtists } = useLibrary();

  const followed = followedArtists
    .map((slug) => getArtist(slug))
    .filter(Boolean)
    .slice(0, 4);

  if (followed.length === 0 && savedArtists.length === 0) return null;

  return (
    <section className="border-b border-border px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Your archive</p>
            <h2 className="mt-1 font-serif text-2xl text-foreground">Artists you follow</h2>
          </div>
          <Link href="/library/artists" className="text-sm text-accent hover:underline">
            Your library
          </Link>
        </div>
        {followed.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {followed.map((a) => a && (
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
        ) : (
          <p className="mt-4 text-sm text-muted-light">
            You have {savedArtists.length} saved artists. Follow artists from their profile pages to see them here.
          </p>
        )}
        <Link href="/library/playlists" className="mt-6 inline-block">
          <Button variant="outline" size="sm">Manage playlists</Button>
        </Link>
      </div>
    </section>
  );
}
