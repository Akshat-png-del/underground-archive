import { artists, genreLabels } from "@/content/artists";
import { articles } from "@/content/editorial";
import { catalogTracks } from "@/content/tracks";
import { archiveSets } from "@/content/sets";
import type { SearchResult } from "@/types/library";

export function searchAll(query: string, limit = 24): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const artist of artists) {
    const hay = `${artist.name} ${artist.city} ${artist.country} ${artist.genres.join(" ")} ${artist.labels.join(" ")}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: "artist",
        id: artist.slug,
        title: artist.name,
        subtitle: `${artist.city} · ${artist.genres.map((g) => genreLabels[g]).join(", ")}`,
        href: `/artists/${artist.slug}`,
        image: artist.portrait,
      });
    }
  }

  for (const track of catalogTracks) {
    const hay = `${track.title} ${track.artist}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: "track",
        id: track.id,
        title: track.title,
        subtitle: track.artist,
        href: `/artists/${track.artistSlug}`,
        image: track.coverArt,
      });
    }
  }

  for (const set of archiveSets) {
    const hay = `${set.title} ${set.artistName} ${set.event} ${set.location}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: "set",
        id: set.id,
        title: set.title,
        subtitle: `${set.artistName} · ${set.event}`,
        href: `/sets/${set.slug}`,
        image: set.thumbnail,
      });
    }
  }

  for (const [slug, label] of Object.entries(genreLabels)) {
    if (label.toLowerCase().includes(q) || slug.replace(/-/g, " ").includes(q)) {
      results.push({
        type: "genre",
        id: slug,
        title: label,
        subtitle: "Genre",
        href: `/genres/${slug}`,
      });
    }
  }

  for (const article of articles) {
    const hay = `${article.title} ${article.excerpt}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: "editorial",
        id: article.slug,
        title: article.title,
        subtitle: article.excerpt.slice(0, 80),
        href: `/editorial/${article.slug}`,
        image: article.heroImage,
      });
    }
  }

  return results.slice(0, limit);
}
