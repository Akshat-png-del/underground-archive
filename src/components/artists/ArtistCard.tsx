import Link from "next/link";
import type { Genre } from "@/types";
import { genreLabels } from "@/content/artists";
import { SafeImage } from "@/components/ui/SafeImage";
import { resolvePortrait, resolvePortraitFallbacks } from "@/lib/archive/verification";
import { Tag } from "@/components/ui/ArchivePrimitives";

interface ArtistCardProps {
  slug: string;
  name: string;
  portrait: string;
  genres: string[];
  city: string;
}

export function ArtistCard({ slug, name, portrait, genres, city }: ArtistCardProps) {
  const artistRef = { slug, portrait, genres: genres as Genre[], heroImage: portrait };
  const imageSrc = resolvePortrait(artistRef);
  const fallbacks = resolvePortraitFallbacks(artistRef).slice(1);
  return (
    <Link href={`/artists/${slug}`} className="group block">
      <div className="overflow-hidden border border-border bg-surface transition-colors hover:border-accent/40">
        <div className="relative aspect-[4/5] w-full">
          <SafeImage
            src={imageSrc}
            fallbacks={fallbacks}
            alt={name}
            fill
            className="w-full"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div className="p-4">
          <h3 className="font-serif text-xl text-foreground group-hover:text-accent transition-colors">
            {name}
          </h3>
          <p className="mt-1 text-sm text-muted">{city}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {genres.slice(0, 2).map((g) => (
              <Tag key={g}>{genreLabels[g] || g}</Tag>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
