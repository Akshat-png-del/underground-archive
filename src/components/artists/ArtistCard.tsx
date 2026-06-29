import Link from "next/link";
import type { Artist } from "@/types";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  resolvePortrait,
  resolvePortraitFallbacksForDisplay,
} from "@/lib/archive/verification";
import { Tag } from "@/components/ui/ArchivePrimitives";

interface ArtistCardProps {
  artist: Pick<Artist, "slug" | "name" | "portrait" | "heroImage" | "genres" | "city" | "image" | "spotifyArtistId">;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const imageSrc = resolvePortrait(artist);
  const fallbacks = resolvePortraitFallbacksForDisplay(artist);

  return (
    <Link href={`/artists/${artist.slug}`} className="group block cursor-pointer">
      <div className="card-editorial overflow-hidden border border-border bg-surface hover-glow hover:border-accent/40">
        <div className="relative aspect-[4/5] w-full">
          <SafeImage
            src={imageSrc}
            fallbacks={fallbacks}
            alt={artist.name}
            fill
            className="w-full"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div className="p-4">
          <h3 className="font-serif text-xl text-foreground transition-colors group-hover:text-accent">
            {artist.name}
          </h3>
          <p className="mt-1 text-sm text-muted">{artist.city}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {artist.genres.slice(0, 2).map((g) => (
              <Tag key={g}>{genreLabels[g] || g}</Tag>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
