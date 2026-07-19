import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export interface PageSEO {
  title: string;
  description: string;
  path: string;
  /**
   * Explicit OG/Twitter image (verified catalog image or absolute URL).
   * When omitted, the branded route-level `opengraph-image` is used automatically.
   */
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
  /** Open Graph object type. Defaults to "website". */
  type?: "website" | "article" | "profile";
}

export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  noIndex,
  keywords,
  type = "website",
}: PageSEO): Metadata {
  const url = `${siteConfig.url}${path}`;
  // Specific verified image when provided, otherwise the branded default OG card.
  const image = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${siteConfig.url}${ogImage}`
    : `${siteConfig.url}${siteConfig.ogImage}`;

  const fullTitle =
    path === "/" ? `${siteConfig.name} — ${title}` : `${title} | ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords?.length ? keywords.join(", ") : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
