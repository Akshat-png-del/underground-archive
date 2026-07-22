import Link from "next/link";
import { getCommunityPlaylists } from "@/content/home/feed";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { formatLocaleNumber } from "@/lib/format";

export function CommunityPlaylistsSection() {
  const playlists = getCommunityPlaylists();

  return (
    <FadeInSection>
      <HomeSection title="Community" badge="Playlists" href="/community" linkLabel="Browse">
        <HomeCarousel>
          {playlists.map((p) => (
            <CarouselItem key={p.id}>
              <Link
                href={`/playlists/${p.id}`}
                className="card-editorial group block border border-border bg-surface p-4 hover-glow"
              >
                <div className="relative mb-4 aspect-square overflow-hidden">
                  <PlaylistCover playlist={p} fill sizes="30vw" className="image-zoom" />
                </div>
                <p className="font-serif text-lg text-foreground group-hover:text-accent">{p.title}</p>
                <p className="mt-1 text-sm text-muted">{p.creatorName}</p>
                <p className="mt-2 font-mono text-xs text-muted-light">
                  {p.items.length} tracks · {formatLocaleNumber(p.likeCount)} likes
                </p>
              </Link>
            </CarouselItem>
          ))}
        </HomeCarousel>
      </HomeSection>
    </FadeInSection>
  );
}
