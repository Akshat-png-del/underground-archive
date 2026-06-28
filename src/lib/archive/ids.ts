import { trackId as buildTrackId, setId as buildSetId } from "@/lib/music";

/** Stable artist identifier — always the slug until a separate ID namespace is needed. */
export function artistId(slug: string): string {
  return slug;
}

export function verifiedTrackId(artistSlug: string, title: string): string {
  return buildTrackId(artistSlug, title);
}

export function verifiedSetId(artistSlug: string, title: string): string {
  return buildSetId(artistSlug, title);
}
