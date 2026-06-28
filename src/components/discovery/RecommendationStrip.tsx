import Link from "next/link";
import type { Artist } from "@/types";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { HomeCarousel, CarouselItem } from "@/components/home/HomeSection";

interface Props {
  title: string;
  artists: Artist[];
  href?: string;
}

export function RecommendationStrip({ title, artists, href }: Props) {
  if (artists.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-accent hover:underline">
            Explore more →
          </Link>
        )}
      </div>
      <div className="mt-6">
        <HomeCarousel>
          {artists.map((a) => (
            <CarouselItem key={a.slug}>
              <ArtistCard
                slug={a.slug}
                name={a.name}
                portrait={a.portrait}
                genres={a.genres}
                city={a.city}
              />
            </CarouselItem>
          ))}
        </HomeCarousel>
      </div>
    </section>
  );
}
