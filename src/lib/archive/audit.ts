import { artists } from "@/content/artists/all";
import { archiveSets } from "@/content/sets";
import { catalogTracks } from "@/content/tracks";
import type { Artist, CurationTier, VerificationStatus } from "@/types";
import { ARTIST_RESEARCH_RECORDS } from "@/content/artists/research";
import { getCurationTier, tierLabel } from "@/lib/archive/curation";
import {
  VERIFIED_YOUTUBE_BY_ARTIST,
  verifyCatalogTrackForArtist,
  verifySetForArtist,
  verifyTrackForArtist,
  youtubeIdAllowedForArtist,
} from "@/lib/archive/verification";
import { artistId } from "@/lib/archive/ids";
import { hasDisplayPortrait, hasVerifiedArtistImage } from "@/lib/archive/images/apply";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";

export type AuditSeverity = "verified" | "suspicious" | "broken" | "missing";

export interface AuditIssue {
  severity: AuditSeverity;
  code: string;
  message: string;
}

export interface ArtistAuditEntry {
  slug: string;
  name: string;
  tier: CurationTier;
  status: VerificationStatus;
  classification: AuditSeverity;
  issues: AuditIssue[];
}

export interface ArchiveAuditReport {
  generatedAt: string;
  totals: {
    artists: number;
    tier1: number;
    tier2: number;
    tier3: number;
    verified: number;
    partial: number;
    unverified: number;
    suspicious: number;
    broken: number;
    sets: number;
    verifiedSets: number;
    tracks: number;
    verifiedTracks: number;
  };
  duplicateSlugs: string[];
  duplicateSetIds: string[];
  artists: ArtistAuditEntry[];
  globalIssues: AuditIssue[];
}

function classifyArtist(
  issues: AuditIssue[],
  tier: CurationTier,
  status: VerificationStatus
): AuditSeverity {
  if (issues.some((i) => i.severity === "broken")) return "broken";
  if (tier === 1 && issues.length === 0) return "verified";
  if (tier === 2 && !issues.some((i) => i.severity === "broken")) return "suspicious";
  if (issues.some((i) => i.severity === "suspicious")) return "suspicious";
  if (tier === 3) return "missing";
  return "suspicious";
}

function hasPortrait(artist: Artist): boolean {
  return hasDisplayPortrait(artist);
}

function auditArtist(artist: Artist): ArtistAuditEntry {
  const issues: AuditIssue[] = [];
  const id = artistId(artist.slug);
  const tier = artist.curationTier ?? getCurationTier(artist.slug);

  if (!artist.name?.trim()) {
    issues.push({ severity: "broken", code: "MISSING_NAME", message: "Name is empty" });
  }
  if (!artist.country?.trim()) {
    issues.push({ severity: "broken", code: "MISSING_COUNTRY", message: "Country is empty" });
  }
  if (artist.genres.length === 0) {
    issues.push({ severity: "missing", code: "NO_GENRES", message: "No genres assigned" });
  }

  for (const track of artist.topTracks) {
    if (track.artistId !== id) {
      issues.push({
        severity: "broken",
        code: "TRACK_OWNER_MISMATCH",
        message: `Track "${track.title}" assigned to wrong artist`,
      });
    }
    if (tier === 1 && track.verified && !verifyTrackForArtist(track, id)) {
      issues.push({
        severity: "broken",
        code: "TRACK_CONTAMINATION",
        message: `Track "${track.title}" failed tier-1 verification`,
      });
    }
  }

  for (const set of artist.essentialSets) {
    if (set.artistId !== id) {
      issues.push({
        severity: "broken",
        code: "SET_OWNER_MISMATCH",
        message: `Set "${set.title}" assigned to wrong artist`,
      });
    }
    if (!youtubeIdAllowedForArtist(set.youtubeId, artist.slug)) {
      issues.push({
        severity: "broken",
        code: "YOUTUBE_CROSS_ARTIST",
        message: `YouTube ID ${set.youtubeId} belongs to another artist`,
      });
    }
    if (tier === 1 && set.verified && !verifySetForArtist(set, id)) {
      issues.push({
        severity: "broken",
        code: "SET_CONTAMINATION",
        message: `Set "${set.title}" failed tier-1 verification`,
      });
    }
  }

  if (tier === 1) {
    if (!hasPortrait(artist)) {
      issues.push({ severity: "missing", code: "TIER1_NO_PORTRAIT", message: "Tier 1 missing portrait" });
    }
    if (artist.topTracks.length === 0) {
      issues.push({ severity: "missing", code: "TIER1_NO_TRACKS", message: "Tier 1 missing tracks" });
    }
  }

  if (tier === 2) {
    if (!hasPortrait(artist)) {
      issues.push({ severity: "suspicious", code: "TIER2_NO_PORTRAIT", message: "Tier 2 missing portrait" });
    }
    if (!artist.editorialBio?.origins?.trim()) {
      issues.push({ severity: "suspicious", code: "TIER2_NO_BIO", message: "Tier 2 missing biography" });
    }
    if (artist.essentialSets.length === 0) {
      issues.push({ severity: "suspicious", code: "TIER2_NO_SET", message: "Tier 2 missing essential set" });
    }
  }

  for (const similar of artist.similarArtists) {
    if (similar === artist.slug) {
      issues.push({ severity: "suspicious", code: "SELF_SIMILAR", message: "Artist listed as similar to self" });
    }
    if (!artists.some((a) => a.slug === similar)) {
      issues.push({
        severity: "suspicious",
        code: "MISSING_SIMILAR",
        message: `Similar artist slug "${similar}" not in archive`,
      });
    }
  }

  return {
    slug: artist.slug,
    name: artist.name,
    tier,
    status: artist.verificationStatus,
    classification: classifyArtist(issues, tier, artist.verificationStatus),
    issues,
  };
}

export function runArchiveAudit(): ArchiveAuditReport {
  const slugCounts = new Map<string, number>();
  for (const a of artists) slugCounts.set(a.slug, (slugCounts.get(a.slug) ?? 0) + 1);
  const duplicateSlugs = [...slugCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s);

  const setIdCounts = new Map<string, number>();
  for (const s of archiveSets) setIdCounts.set(s.id, (setIdCounts.get(s.id) ?? 0) + 1);
  const duplicateSetIds = [...setIdCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s);

  const globalIssues: AuditIssue[] = [];
  if (duplicateSlugs.length > 0) {
    globalIssues.push({
      severity: "broken",
      code: "DUPLICATE_SLUGS",
      message: `Duplicate artist slugs: ${duplicateSlugs.join(", ")}`,
    });
  }
  if (duplicateSetIds.length > 0) {
    globalIssues.push({
      severity: "broken",
      code: "DUPLICATE_SETS",
      message: `${duplicateSetIds.length} duplicate set IDs`,
    });
  }

  for (const set of archiveSets) {
    if (!set.verified) continue;
    if (!verifySetForArtist(set, set.artistSlug)) {
      globalIssues.push({
        severity: "broken",
        code: "GLOBAL_SET_CONTAMINATION",
        message: `Set ${set.slug} failed verification`,
      });
    }
  }

  for (const track of catalogTracks) {
    if (!track.verified) continue;
    if (!verifyCatalogTrackForArtist(track, track.artistSlug)) {
      globalIssues.push({
        severity: "broken",
        code: "GLOBAL_TRACK_CONTAMINATION",
        message: `Track ${track.id} failed verification`,
      });
    }
  }

  const artistAudits = artists.map(auditArtist);

  const tier1 = artists.filter((a) => a.curationTier === 1).length;
  const tier2 = artists.filter((a) => a.curationTier === 2).length;
  const tier3 = artists.filter((a) => a.curationTier === 3).length;
  const verified = artists.filter((a) => a.verificationStatus === "verified").length;
  const partial = artists.filter((a) => a.verificationStatus === "partial").length;
  const unverified = artists.filter((a) => a.verificationStatus === "unverified").length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      artists: artists.length,
      tier1,
      tier2,
      tier3,
      verified,
      partial,
      unverified,
      suspicious: artistAudits.filter((a) => a.classification === "suspicious").length,
      broken: artistAudits.filter((a) => a.classification === "broken").length,
      sets: archiveSets.length,
      verifiedSets: archiveSets.filter((s) => s.verified).length,
      tracks: catalogTracks.length,
      verifiedTracks: catalogTracks.filter((t) => t.verified).length,
    },
    duplicateSlugs,
    duplicateSetIds,
    artists: artistAudits,
    globalIssues,
  };
}

export function formatAuditReport(report: ArchiveAuditReport): string {
  const lines: string[] = [
    `# Archive authenticity audit`,
    `Generated: ${report.generatedAt}`,
    ``,
    `## Summary`,
    `- Artists: ${report.totals.artists} (${report.totals.tier1} tier 1, ${report.totals.tier2} tier 2, ${report.totals.tier3} tier 3)`,
    `- Status: ${report.totals.verified} verified, ${report.totals.partial} partial, ${report.totals.unverified} unverified`,
    `- Sets: ${report.totals.sets} (${report.totals.verifiedSets} verified)`,
    `- Tracks: ${report.totals.tracks} (${report.totals.verifiedTracks} verified)`,
    `- Suspicious profiles: ${report.totals.suspicious}`,
    `- Broken profiles: ${report.totals.broken}`,
    `- Research registry: ${ARTIST_RESEARCH_RECORDS.length} artists with editorial records`,
    ``,
  ];

  if (report.globalIssues.length > 0) {
    lines.push(`## Global issues`);
    for (const issue of report.globalIssues) {
      lines.push(`- [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
    }
    lines.push("");
  }

  const groups: Record<AuditSeverity, ArtistAuditEntry[]> = {
    verified: [],
    suspicious: [],
    broken: [],
    missing: [],
  };
  for (const entry of report.artists) groups[entry.classification].push(entry);

  for (const [label, entries] of Object.entries(groups) as [AuditSeverity, ArtistAuditEntry[]][]) {
    lines.push(`## ${label.charAt(0).toUpperCase() + label.slice(1)} (${entries.length})`);
    const sample = entries.slice(0, label === "verified" ? 15 : 30);
    for (const entry of sample) {
      lines.push(`- ${entry.name} (${entry.slug}) [${tierLabel(entry.tier)}]`);
      for (const issue of entry.issues.slice(0, 3)) {
        lines.push(`  - ${issue.code}: ${issue.message}`);
      }
    }
    if (entries.length > sample.length) {
      lines.push(`  … and ${entries.length - sample.length} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function assertArchiveIntegrity(report: ArchiveAuditReport): void {
  const broken = report.globalIssues.filter((i) => i.severity === "broken");
  const brokenArtists = report.artists.filter((a) => a.classification === "broken");
  if (broken.length === 0 && brokenArtists.length === 0) return;

  const summary = [
    ...broken.map((i) => i.message),
    ...brokenArtists.slice(0, 5).map((a) => `${a.slug}: ${a.issues[0]?.message ?? "broken"}`),
  ].join("\n");

  throw new Error(`Archive integrity check failed:\n${summary}`);
}
