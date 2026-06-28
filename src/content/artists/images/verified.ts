/**
 * Manual verified artist photography registry.
 *
 * Add entries ONLY after cross-checking:
 * - artist name / facial identity
 * - official social handles
 * - associated labels and releases
 *
 * Never add AI-generated, Pinterest, or unverified Google Images.
 * Priority: Spotify → website → Instagram → Facebook → RA → label press → festival → Beatport → editorial.
 */
import type { VerifiedImageRecord } from "@/lib/archive/images/types";
import { RESEARCHED_VERIFIED_PORTRAITS } from "./researched-portraits";

export const VERIFIED_ARTIST_IMAGES: VerifiedImageRecord[] = [
  ...RESEARCHED_VERIFIED_PORTRAITS,
];

const BY_SLUG = new Map<string, VerifiedImageRecord>(
  VERIFIED_ARTIST_IMAGES.map((r) => [r.slug, r])
);

export function getVerifiedImageRecord(slug: string): VerifiedImageRecord | undefined {
  return BY_SLUG.get(slug);
}

export function getAllVerifiedImageRecords(): VerifiedImageRecord[] {
  return VERIFIED_ARTIST_IMAGES;
}
