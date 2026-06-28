import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export interface PageSEO {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
}

export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  noIndex,
  keywords,
}: PageSEO): Metadata {
  const url = `${siteConfig.url}${path}`;
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
    keywords: keywords?.join(", "),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
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
