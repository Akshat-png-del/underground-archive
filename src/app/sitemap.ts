import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { artists, genreLabels } from "@/content/artists";
import { articles } from "@/content/editorial";
import { archiveSets } from "@/content/sets";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;

  const staticPages = ["/", "/artists", "/genres", "/discover", "/sets", "/editorial", "/community", "/library", "/search"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.8,
    })
  );

  return [
    ...staticPages,
    ...artists.map((a) => ({
      url: `${base}/artists/${a.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...Object.keys(genreLabels).map((slug) => ({
      url: `${base}/genres/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...archiveSets.map((s) => ({
      url: `${base}/sets/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: `${base}/editorial/${a.slug}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
