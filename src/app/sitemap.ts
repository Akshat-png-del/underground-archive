import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { artists, genreLabels } from "@/content/artists";
import { articles } from "@/content/editorial";
import { getVisibleSetCollections, mixtapeSets } from "@/content/sets";
import {
  getGenreHubSlugs,
  getSimilarHubSlugs,
} from "@/content/hubs";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticPages = ["/", "/artists", "/genres", "/sets", "/editorial", "/community"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.8,
    })
  );

  return [
    ...staticPages,
    // Artist profiles
    ...artists.map((a) => ({
      url: `${base}/artists/${a.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Genre pages
    ...Object.keys(genreLabels).map((slug) => ({
      url: `${base}/genres/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Genre artist hubs (e.g. Hard Techno Artists)
    ...getGenreHubSlugs().map((slug) => ({
      url: `${base}/artists/genre/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // "Artists like X" discovery hubs
    ...getSimilarHubSlugs().map((slug) => ({
      url: `${base}/artists/similar/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // Set / festival collection archives (e.g. Best HÖR Berlin Sets)
    ...getVisibleSetCollections(mixtapeSets).map((category) => ({
      url: `${base}/sets/collections/${category}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Individual sets
    ...mixtapeSets.map((s) => ({
      url: `${base}/sets/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Editorial
    ...articles.map((a) => ({
      url: `${base}/editorial/${a.slug}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
