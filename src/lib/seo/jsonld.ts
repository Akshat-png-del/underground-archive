import { siteConfig } from "@/config/site";

/** Resolve a relative or absolute path/URL to an absolute canonical URL. */
export function absoluteUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${siteConfig.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Convert a verified display duration ("1:29:35" or "58:12") into an
 * ISO 8601 duration ("PT1H29M35S"). Returns undefined when unknown — never invent.
 */
export function durationToISO8601(duration?: string): string | undefined {
  if (!duration) return undefined;
  const parts = duration.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else return undefined;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}` || "PT0S";
}

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
      target: `${siteConfig.url}/search?q={search_term_string}`,
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
  /** Verified external profile URLs (Spotify, SoundCloud, Instagram, RA). */
  sameAs?: string[];
  /** Verified recordings by this artist. */
  tracks?: { name: string; url?: string; duration?: string }[];
}) {
  const sameAs = (artist.sameAs ?? []).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    description: artist.description,
    url: absoluteUrl(artist.path),
    image: absoluteUrl(artist.image),
    genre: artist.genres,
    foundingLocation: artist.origin,
    ...(sameAs.length ? { sameAs } : {}),
    ...(artist.tracks?.length
      ? {
          track: artist.tracks.map((t) => ({
            "@type": "MusicRecording",
            name: t.name,
            ...(t.url ? { url: t.url } : {}),
            ...(durationToISO8601(t.duration)
              ? { duration: durationToISO8601(t.duration) }
              : {}),
          })),
        }
      : {}),
  };
}

/** Single verified recording (track) — only emit when a real Spotify/YouTube URL exists. */
export function musicRecordingSchema(track: {
  name: string;
  byArtist: string;
  url?: string;
  duration?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: track.name,
    byArtist: { "@type": "MusicGroup", name: track.byArtist },
    ...(track.url ? { url: track.url } : {}),
    ...(durationToISO8601(track.duration)
      ? { duration: durationToISO8601(track.duration) }
      : {}),
    ...(track.image ? { image: absoluteUrl(track.image) } : {}),
  };
}

/**
 * VideoObject for a verified YouTube set. Duration is only included when it was
 * API-verified upstream (never fabricated).
 */
export function videoObjectSchema(video: {
  name: string;
  description: string;
  path: string;
  youtubeId: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    url: absoluteUrl(video.path),
    thumbnailUrl: video.thumbnailUrl,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    ...(video.uploadDate ? { uploadDate: video.uploadDate } : {}),
    ...(durationToISO8601(video.duration)
      ? { duration: durationToISO8601(video.duration) }
      : {}),
  };
}

/** Ordered list of internal entities — powers rich results for hub pages. */
export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/** CollectionPage wrapper for SEO hub/landing pages. */
export function collectionPageSchema(page: {
  name: string;
  description: string;
  path: string;
  items?: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.name,
    description: page.description,
    url: absoluteUrl(page.path),
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
    ...(page.items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: page.items.length,
            itemListElement: page.items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              url: absoluteUrl(item.path),
            })),
          },
        }
      : {}),
  };
}

/** FAQ structured data. Answers must be plain text derived from verified data. */
export function faqPageSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
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
