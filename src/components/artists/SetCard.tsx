import type { EssentialSet } from "@/types";
import { shouldRenderSetEmbed } from "@/lib/archive/verification";
import { Tag } from "@/components/ui/ArchivePrimitives";
import { MediaUnavailable } from "@/components/archive/MediaUnavailable";

interface SetCardProps {
  set: EssentialSet;
  artistId: string;
  artistSlug?: string;
}

export function SetCardEmbed({ set, artistId, artistSlug }: SetCardProps) {
  const slug = artistSlug ?? artistId;
  const showEmbed = shouldRenderSetEmbed(set, artistId, slug);

  if (!showEmbed || !set.youtubeId) {
    return (
      <div className="border border-border bg-surface">
        <MediaUnavailable />
        <div className="p-4">
          <Tag>{set.venue}</Tag>
          <h3 className="mt-2 font-serif text-lg text-foreground">{set.title}</h3>
          <p className="mt-1 text-xs text-muted">{set.year}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-surface">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${set.youtubeId}`}
          title={set.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <Tag>{set.venue}</Tag>
        <h3 className="mt-2 font-serif text-lg text-foreground">{set.title}</h3>
        <p className="mt-1 text-xs text-muted">{set.year}</p>
      </div>
    </div>
  );
}
