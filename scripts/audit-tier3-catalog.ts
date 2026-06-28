#!/usr/bin/env npx tsx
/**
 * Tier 3 catalog audit — report only, no file mutations.
 * Usage: npx tsx scripts/audit-tier3-catalog.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import { getCurationTier, TIER_1_SLUGS, TIER_2_SLUGS } from "../src/lib/archive/curation/tiers";
import { getVerifiedImageRecord } from "../src/content/artists/images/verified";
import { getResearchBySlug } from "../src/content/artists/research";
import { fieldVerified } from "../src/content/artists/research/types";
import { getIngestedMetadata } from "../src/content/artists/metadata";
import { getCatalogExpansion } from "../src/lib/catalog/apply-expansion";
import { hasVerifiedArtistImage } from "../src/lib/archive/images/apply";
import { isSuspiciousPortraitUrl } from "../src/lib/archive/images/validate";
import { artistCollections } from "../src/content/artists/collections";
import type { Artist, ExternalLinks } from "../src/types";

const PLACEHOLDER_TRACK_TITLES = new Set([
  "warehouse pressure",
  "peak hour",
  "distorted dreams",
  "night shift",
  "raw energy",
  "factory floor",
  "steel rhythm",
  "dark matter",
  "machine soul",
  "void",
  "cold pulse",
  "body control",
  "neon decay",
  "ashes",
  "midnight drive",
  "live session",
  "essential mix",
  "warehouse",
]);

const NOTABLE_LABELS = [
  "ostgut ton",
  "stroboscopic artefacts",
  "mord",
  "perc trax",
  "harthouse",
  "mute",
  "metropolis",
  "xl",
  "r&s",
  "clr",
  "dement3d",
];

const TIER_1 = new Set<string>(TIER_1_SLUGS);
const COLLECTION_SLUGS = new Set(
  Object.values(artistCollections).flatMap((c) => c.slugs)
);

interface Tier3AuditRow {
  slug: string;
  name: string;
  portraitStatus: string;
  biographyStatus: string;
  trackCount: number;
  meaningfulTrackCount: number;
  setCount: number;
  socialLinksCount: number;
  sourceConfidence: string;
  enrichmentErrors: number;
  externalPresence: string[];
}

function isTemplateBio(artist: Artist): boolean {
  const { origins, breakthrough } = artist.editorialBio;
  return (
    origins.includes("emerged from") &&
    origins.includes("underground electronic scene") &&
    breakthrough.includes("International festival appearances")
  );
}

function hasVerifiedPortrait(artist: Artist): boolean {
  if (hasVerifiedArtistImage(artist)) return true;
  const registry = getVerifiedImageRecord(artist.slug);
  if (registry?.imageVerified) return true;
  const research = getResearchBySlug(artist.slug);
  if (research?.image && fieldVerified(research.image.confidence)) return true;
  return false;
}

function portraitStatus(artist: Artist): string {
  if (hasVerifiedPortrait(artist)) return "verified";
  const url = artist.portrait ?? "";
  if (isSuspiciousPortraitUrl(url) || url.includes("/images/genres/")) return "genre-fallback";
  if (url.startsWith("http")) return "editorial-unverified";
  return "missing";
}

function biographyStatus(artist: Artist): string {
  const origins = artist.editorialBio?.origins?.trim() ?? "";
  if (!origins) return "missing";
  if (isTemplateBio(artist)) return "template-only";
  return "custom";
}

function countSocialLinks(links: ExternalLinks): number {
  return Object.values(links).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

function isMeaningfulTrack(artist: Artist, title: string, spotifyUrl?: string): boolean {
  if (spotifyUrl) return true;
  const lower = title.toLowerCase();
  if (PLACEHOLDER_TRACK_TITLES.has(lower)) return false;
  if (lower === artist.name.toLowerCase()) return false;
  return true;
}

function meaningfulTrackCount(artist: Artist): number {
  return artist.topTracks.filter((t) =>
    isMeaningfulTrack(artist, t.title, t.spotifyUrl)
  ).length;
}

function sourceConfidence(artist: Artist): string {
  const ingested = getIngestedMetadata(artist.slug);
  const okSources = Object.values(ingested?.sources ?? {}).filter((s) => s.status === "ok").length;
  const errorSources = Object.values(ingested?.sources ?? {}).filter((s) => s.status === "error").length;

  if (artist.verificationStatus === "verified") return "verified";
  if (hasVerifiedPortrait(artist)) return "high — verified portrait";
  if (okSources >= 2) return `medium — ${okSources} ingestion sources ok`;
  if (okSources === 1) return `low — 1 ingestion source ok`;
  if (errorSources > 0) return `low — ${errorSources} enrichment error(s)`;
  return "none";
}

function enrichmentErrorCount(slug: string): number {
  const ingested = getIngestedMetadata(slug);
  if (!ingested) return 0;
  return Object.values(ingested.sources ?? {}).filter((s) => s.status === "error").length;
}

function detectExternalPresence(artist: Artist): string[] {
  const found: string[] = [];
  const ingested = getIngestedMetadata(artist.slug);
  const research = getResearchBySlug(artist.slug);
  const links = { ...artist.externalLinks };

  if (links.youtube || ingested?.youtube?.channelUrl) found.push("YouTube");
  if (ingested?.discogs?.id || ingested?.discogs?.imageUrl) found.push("Discogs");
  if (ingested?.musicbrainz?.mbid) found.push("MusicBrainz");
  if (links.residentAdvisor || research?.residentAdvisor?.url) found.push("Resident Advisor");
  if (links.instagram || research?.instagram?.url) found.push("Instagram");
  if (links.spotify || ingested?.spotify?.artistId || artist.spotifyArtistId) found.push("Spotify");
  if (ingested?.resolvedImage?.url && ingested.resolvedImage.source !== "youtube") {
    found.push(`ingested:${ingested.resolvedImage.source}`);
  }

  const expansion = getCatalogExpansion(artist.slug);
  if (expansion?.tracks?.length) found.push("expansion-tracks");
  if (expansion?.sets?.length) found.push("expansion-sets");

  return [...new Set(found)];
}

function isEstablishedArtist(artist: Artist): boolean {
  if (artist.featured || artist.trending) return true;
  if (COLLECTION_SLUGS.has(artist.slug)) return true;
  if (artist.activeSince <= 2005) return true;
  if (artist.labels.some((l) => NOTABLE_LABELS.some((n) => l.toLowerCase().includes(n)))) {
    return true;
  }
  return false;
}

function isCulturallyRelevant(artist: Artist, presence: string[]): boolean {
  if (isEstablishedArtist(artist)) return true;
  if (presence.length > 0) return true;
  if (artist.similarArtists.some((s) => TIER_1.has(s))) return true;
  return false;
}

function repeatedEnrichmentFailures(slug: string, presence: string[]): boolean {
  const errors = enrichmentErrorCount(slug);
  const ingested = getIngestedMetadata(slug);
  const expansion = getCatalogExpansion(slug);
  const expansionEmpty =
    !expansion || (expansion.tracks.length === 0 && expansion.sets.length === 0);
  const noPortrait = !ingested?.resolvedImage?.url;
  return errors >= 1 && expansionEmpty && noPortrait && presence.length === 0;
}

function classify(row: Tier3AuditRow, artist: Artist): "KEEP" | "REVIEW" | "REMOVE_CANDIDATE" {
  const hasBio = row.biographyStatus === "custom";
  const meetsKeep =
    row.portraitStatus === "verified" &&
    hasBio &&
    (row.meaningfulTrackCount >= 2 || row.setCount >= 1);

  if (meetsKeep) return "KEEP";

  const noVerifiedPortrait = row.portraitStatus !== "verified";
  const noTracks = row.meaningfulTrackCount === 0;
  const noSets = row.setCount === 0;
  const noBio = row.biographyStatus !== "custom";
  const noSocial = row.socialLinksCount === 0;
  const failedEnrichment = repeatedEnrichmentFailures(artist.slug, row.externalPresence);
  const noPresence = row.externalPresence.length === 0;

  const removeCandidate =
    noVerifiedPortrait &&
    noTracks &&
    noSets &&
    noBio &&
    noSocial &&
    failedEnrichment &&
    noPresence &&
    !isEstablishedArtist(artist);

  if (removeCandidate) return "REMOVE_CANDIDATE";

  return "REVIEW";
}

function reviewReason(row: Tier3AuditRow, artist: Artist): string {
  const parts: string[] = [];
  if (row.portraitStatus !== "verified") {
    parts.push(`portrait: ${row.portraitStatus}`);
  }
  if (row.biographyStatus === "template-only") parts.push("template biography only");
  if (row.meaningfulTrackCount === 0 && row.trackCount > 0) {
    parts.push(`${row.trackCount} placeholder tracks only`);
  } else if (row.meaningfulTrackCount > 0) {
    parts.push(`${row.meaningfulTrackCount} meaningful track(s)`);
  }
  if (row.setCount > 0) parts.push(`${row.setCount} set(s)`);
  if (row.socialLinksCount > 0) parts.push(`${row.socialLinksCount} social link(s)`);
  if (row.externalPresence.length > 0) {
    parts.push(`presence: ${row.externalPresence.join(", ")}`);
  }
  if (isCulturallyRelevant(artist, row.externalPresence)) {
    parts.push("culturally relevant — retain for manual enrichment");
  }
  if (row.enrichmentErrors > 0) {
    parts.push(`${row.enrichmentErrors} enrichment error(s)`);
  }
  return parts.join("; ") || "partial metadata — needs editorial review";
}

function removeReason(row: Tier3AuditRow): string {
  return [
    `portrait: ${row.portraitStatus}`,
    `biography: ${row.biographyStatus}`,
    `${row.meaningfulTrackCount} meaningful tracks / ${row.setCount} sets`,
    `${row.socialLinksCount} social links`,
    `${row.enrichmentErrors} enrichment error(s)`,
    row.externalPresence.length === 0
      ? "no presence on YouTube, Discogs, MusicBrainz, RA, or Instagram"
      : `unexpected presence: ${row.externalPresence.join(", ")}`,
    `confidence: ${row.sourceConfidence}`,
  ].join("; ");
}

function main() {
  const tier3 = artists.filter((a) => getCurationTier(a.slug) === 3);

  const touchedTier12 = tier3.filter(
    (a) => TIER_1_SLUGS.includes(a.slug as (typeof TIER_1_SLUGS)[number]) || TIER_2_SLUGS.includes(a.slug as (typeof TIER_2_SLUGS)[number])
  );
  if (touchedTier12.length > 0) {
    throw new Error(
      `Safety check failed: tier assignment overlap for ${touchedTier12.map((a) => a.slug).join(", ")}`
    );
  }

  const rows: Tier3AuditRow[] = tier3.map((artist) => {
    const ingested = getIngestedMetadata(artist.slug);
    const research = getResearchBySlug(artist.slug);
    const links = { ...artist.externalLinks };
    if (research) {
      if (research.spotify?.url) links.spotify = research.spotify.url;
      if (research.instagram?.url) links.instagram = research.instagram.url;
      if (research.youtube?.url) links.youtube = research.youtube.url;
      if (research.residentAdvisor?.url) links.residentAdvisor = research.residentAdvisor.url;
    }

    const presence = detectExternalPresence(artist);

    return {
      slug: artist.slug,
      name: artist.name,
      portraitStatus: portraitStatus(artist),
      biographyStatus: biographyStatus(artist),
      trackCount: artist.topTracks.length,
      meaningfulTrackCount: meaningfulTrackCount(artist),
      setCount: artist.essentialSets.length,
      socialLinksCount: countSocialLinks(links),
      sourceConfidence: sourceConfidence(artist),
      enrichmentErrors: enrichmentErrorCount(artist.slug),
      externalPresence: presence,
    };
  });

  const keep: Tier3AuditRow[] = [];
  const review: { row: Tier3AuditRow; reason: string; artist: Artist }[] = [];
  const remove: { row: Tier3AuditRow; reason: string }[] = [];

  for (const row of rows) {
    const artist = tier3.find((a) => a.slug === row.slug)!;
    const group = classify(row, artist);
    if (group === "KEEP") keep.push(row);
    else if (group === "REMOVE_CANDIDATE") remove.push({ row, reason: removeReason(row) });
    else review.push({ row, reason: reviewReason(row, artist), artist });
  }

  const lines: string[] = [
    "# Tier 3 catalog audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    "",
    `- Tier 3 artists audited: **${rows.length}**`,
    `- Tier 1 artists touched: **0** (unchanged)`,
    `- Tier 2 artists touched: **0** (unchanged)`,
    "",
    "### Classification summary",
    "",
    `| Group | Count |`,
    `| --- | --- |`,
    `| KEEP | ${keep.length} |`,
    `| REVIEW | ${review.length} |`,
    `| REMOVE_CANDIDATE | ${remove.length} |`,
    "",
    "> **Status:** Report only — no files modified. Awaiting manual approval before archiving.",
    "",
    "## KEEP",
    "",
  ];

  if (keep.length === 0) {
    lines.push("_None — no Tier 3 artists meet verified portrait + custom bio + media thresholds._");
  } else {
    for (const row of keep.sort((a, b) => a.slug.localeCompare(b.slug))) {
      lines.push(
        `- **${row.slug}** — portrait: ${row.portraitStatus}; bio: ${row.biographyStatus}; tracks: ${row.meaningfulTrackCount}; sets: ${row.setCount}; confidence: ${row.sourceConfidence}`
      );
    }
  }

  lines.push("", "## REVIEW", "");
  for (const { row, reason } of review.sort((a, b) => a.row.slug.localeCompare(b.row.slug))) {
    lines.push(`- **${row.slug}** — ${reason}`);
  }

  lines.push("", "## REMOVE_CANDIDATE", "");
  if (remove.length === 0) {
    lines.push("_None — no Tier 3 artists met all strict removal criteria._");
  } else {
    for (const { row, reason } of remove.sort((a, b) => a.row.slug.localeCompare(b.row.slug))) {
      lines.push(`- **${row.slug}** — ${reason}`);
    }
  }

  lines.push("", "## Detail appendix", "");
  lines.push("| Slug | Portrait | Bio | Tracks | Sets | Social | Confidence | Presence |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows.sort((a, b) => a.slug.localeCompare(b.slug))) {
    lines.push(
      `| ${row.slug} | ${row.portraitStatus} | ${row.biographyStatus} | ${row.meaningfulTrackCount}/${row.trackCount} | ${row.setCount} | ${row.socialLinksCount} | ${row.sourceConfidence} | ${row.externalPresence.join(", ") || "—"} |`
    );
  }

  const markdown = lines.join("\n");
  const outDir = join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "tier3-catalog-audit.md");
  writeFileSync(outPath, markdown, "utf8");

  console.log(markdown);
  console.log(`\nReport written to ${outPath}`);
  console.log(
    `\nSummary: ${keep.length} KEEP, ${review.length} REVIEW, ${remove.length} REMOVE_CANDIDATE (${rows.length} Tier 3 total)`
  );
}

main();
