import { getSet } from "@/content/sets";

/** FROZEN — see docs/sets-video-architecture-freeze.md. Sets enter playback only via /sets/[slug]. */

export function setWatchPath(slug: string): string {
  return `/sets/${slug}`;
}

export function resolveSetWatchSlug(refId: string, slug?: string | null): string | null {
  if (slug) return slug;
  return getSet(refId)?.slug ?? null;
}

export function isOnSetWatchPage(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname === setWatchPath(slug);
}
