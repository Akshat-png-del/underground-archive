import { siteConfig } from "@/config/site";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/discover?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image
      ? article.image.startsWith("http")
        ? article.image
        : `${siteConfig.url}${article.image}`
      : `${siteConfig.url}${siteConfig.ogImage}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    mainEntityOfPage: `${siteConfig.url}${article.path}`,
  };
}

export function musicianSchema(artist: {
  name: string;
  description: string;
  path: string;
  image?: string;
  genres: string[];
  origin?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    description: artist.description,
    url: `${siteConfig.url}${artist.path}`,
    image: artist.image,
    genre: artist.genres,
    foundingLocation: artist.origin,
  };
}

export function placeSchema(place: {
  name: string;
  description: string;
  path: string;
  image?: string;
  address?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.name,
    description: place.description,
    url: `${siteConfig.url}${place.path}`,
    image: place.image,
    address: place.address,
  };
}
