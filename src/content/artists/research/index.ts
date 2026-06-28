import { ARTIST_RESEARCH_RECORDS } from "./records";
import type { ArtistResearchRecord } from "./types";
import { validateResearchRecord } from "@/lib/archive/pipeline/validate";

const bySlug = new Map<string, ArtistResearchRecord>(
  ARTIST_RESEARCH_RECORDS.map((record) => [record.slug, record])
);

/** Fail fast if any research record violates pipeline rules. */
function assertResearchIntegrity(): void {
  const errors: string[] = [];
  for (const record of ARTIST_RESEARCH_RECORDS) {
    for (const issue of validateResearchRecord(record)) {
      errors.push(issue.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Artist research registry invalid:\n${errors.join("\n")}`);
  }
}

assertResearchIntegrity();

export function getResearchBySlug(slug: string): ArtistResearchRecord | undefined {
  return bySlug.get(slug);
}

export function getVerifiedYoutubeByArtist(): Readonly<Record<string, readonly string[]>> {
  const registry: Record<string, string[]> = {};
  for (const record of ARTIST_RESEARCH_RECORDS) {
    if (record.verificationStatus !== "verified" || !record.sets?.length) continue;
    registry[record.slug] = record.sets.map((s) => s.youtubeId);
  }
  return registry;
}

export { ARTIST_RESEARCH_RECORDS };
