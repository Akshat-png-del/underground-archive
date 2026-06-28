import { artists } from "@/content/artists/all";
import { getCurationTier } from "@/lib/archive/curation";
import { hasDisplayPortrait, hasVerifiedArtistImage } from "@/lib/archive/images/apply";
import { isBlockedImageUrl, isValidImageUrl } from "@/lib/archive/images/validate";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import type { ImageAuditEntry, ImageAuditReport } from "./types";

function classifyEntry(
  artist: (typeof artists)[number],
  issues: string[]
): ImageAuditEntry["classification"] {
  if (issues.some((i) => i.startsWith("Broken"))) return "broken";
  if (hasVerifiedArtistImage(artist)) return "verified";
  if (issues.some((i) => i.startsWith("Suspicious"))) return "suspicious";
  if (hasDisplayPortrait(artist)) return "awaiting-verification";
  return "awaiting-verification";
}

function auditArtistImage(artist: (typeof artists)[number]): ImageAuditEntry {
  const issues: string[] = [];
  const url = artist.image?.url ?? artist.portrait;
  const tier = artist.curationTier ?? getCurationTier(artist.slug);

  if (hasVerifiedArtistImage(artist)) {
    if (!isValidImageUrl(url)) {
      issues.push(`Broken URL format on verified image: ${url}`);
    }
    return {
      slug: artist.slug,
      name: artist.name,
      tier,
      classification: classifyEntry(artist, issues),
      imageUrl: url,
      sourceType: artist.image.sourceType,
      imageVerified: true,
      issues,
    };
  }

  if (url && url !== FALLBACK_IMAGE) {
    if (isBlockedImageUrl(url)) {
      issues.push(`Blocked image source: ${url}`);
    } else if (!isValidImageUrl(url) && !url.startsWith("/")) {
      issues.push(`Broken URL: ${url}`);
    }
  }

  if (!hasDisplayPortrait(artist)) {
    issues.push("No display portrait — using neutral fallback");
  }

  const classification = classifyEntry(artist, issues);
  const displayUrl = url === FALLBACK_IMAGE ? null : url;

  return {
    slug: artist.slug,
    name: artist.name,
    tier,
    classification,
    imageUrl: displayUrl,
    sourceType: artist.image?.sourceType ?? "pending-review",
    imageVerified: false,
    issues,
  };
}

function findDuplicateImages(entries: ImageAuditEntry[]): ImageAuditReport["duplicateImages"] {
  const byUrl = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.imageUrl || !entry.imageVerified) continue;
    const list = byUrl.get(entry.imageUrl) ?? [];
    list.push(entry.slug);
    byUrl.set(entry.imageUrl, list);
  }
  return [...byUrl.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([url, slugs]) => ({ url, slugs }));
}

export function runImageAudit(): ImageAuditReport {
  const entries = artists.map(auditArtistImage);
  const duplicateImages = findDuplicateImages(entries);

  const verified = entries.filter((e) => e.classification === "verified");
  const awaitingVerification = entries.filter(
    (e) => e.classification === "awaiting-verification" && e.imageUrl
  );
  const suspiciousAssignments = entries.filter((e) => e.classification === "suspicious");
  const brokenUrls = entries.filter((e) => e.classification === "broken");

  for (const dup of duplicateImages) {
    for (const slug of dup.slugs) {
      const entry = entries.find((e) => e.slug === slug);
      if (entry && entry.classification === "verified") {
        entry.classification = "suspicious";
        entry.issues.push(
          `Suspicious: duplicate verified URL shared with ${dup.slugs.filter((s) => s !== slug).join(", ")}`
        );
      }
    }
  }

  const coveragePercent =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.filter((e) => e.imageUrl || e.classification === "verified").length /
            entries.length) *
            100
        );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      artists: entries.length,
      verified: verified.length,
      awaitingVerification: awaitingVerification.length,
      suspicious: suspiciousAssignments.length,
      broken: brokenUrls.length,
      duplicateUrls: duplicateImages.length,
      coveragePercent,
    },
    verified,
    awaitingVerification,
    duplicateImages,
    suspiciousAssignments,
    brokenUrls,
    artists: entries,
  };
}

export function formatImageAuditReport(report: ImageAuditReport): string {
  const lines: string[] = [
    `# Artist image authenticity audit`,
    `Generated: ${report.generatedAt}`,
    ``,
    `## Summary`,
    `- Artists: ${report.totals.artists}`,
    `- Verified photography: ${report.totals.verified}`,
    `- Editorial / genre portraits (display-ready): ${report.totals.awaitingVerification}`,
    `- Suspicious assignments: ${report.totals.suspicious}`,
    `- Broken URLs: ${report.totals.broken}`,
    `- Duplicate verified URLs: ${report.totals.duplicateUrls}`,
    `- Visual coverage: ${report.totals.coveragePercent}%`,
    ``,
  ];

  if (report.duplicateImages.length > 0) {
    lines.push(`## Duplicate images (${report.duplicateImages.length})`);
    for (const dup of report.duplicateImages) {
      lines.push(`- ${dup.url}`);
      lines.push(`  - Artists: ${dup.slugs.join(", ")}`);
    }
    lines.push("");
  }

  const sections: [string, ImageAuditEntry[]][] = [
    ["Verified images", report.verified],
    ["Editorial portraits (unverified)", report.awaitingVerification],
    ["Suspicious assignments", report.suspiciousAssignments],
    ["Broken URLs", report.brokenUrls],
  ];

  for (const [title, group] of sections) {
    lines.push(`## ${title} (${group.length})`);
    const sample = group.slice(0, 40);
    for (const entry of sample) {
      lines.push(`- ${entry.name} (${entry.slug}) [Tier ${entry.tier}]`);
      if (entry.imageUrl) lines.push(`  - URL: ${entry.imageUrl}`);
      lines.push(`  - Source: ${entry.sourceType}`);
      for (const issue of entry.issues.slice(0, 3)) {
        lines.push(`  - ${issue}`);
      }
    }
    if (group.length > sample.length) {
      lines.push(`  … and ${group.length - sample.length} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
