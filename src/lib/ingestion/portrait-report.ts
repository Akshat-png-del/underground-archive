import { readAllArtistMetadata } from "./store";
import { getArtistSeeds } from "./seeds";
import { isGenrePortraitUrl } from "./portrait-sources";
import { isProtectedPortrait } from "./portraits";
import { isSuspiciousPortraitUrl } from "@/lib/archive/images/validate";
import { getVerifiedImageRecord } from "@/content/artists/images/verified";
import { namesMatch } from "@/lib/archive/pipeline/validate";
import type { IngestedPortraitSource } from "./types";

export interface PortraitSyncReport {
  generatedAt: string;
  totals: {
    artists: number;
    found: number;
    missing: number;
    protected: number;
    coveragePercent: number;
    targetMet: boolean;
  };
  bySource: Partial<Record<IngestedPortraitSource, number>>;
  found: { slug: string; source: IngestedPortraitSource; url: string }[];
  missing: string[];
  protected: string[];
  duplicateImages: { url: string; slugs: string[] }[];
  suspiciousAssignments: {
    slug: string;
    url: string;
    reason: string;
  }[];
}

const COVERAGE_TARGET_PERCENT = 80;

function normalizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

function hasDisplayPortrait(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/images/portraits/")) return true;
  if (!url.startsWith("http")) return false;
  if (isGenrePortraitUrl(url)) return false;
  if (isSuspiciousPortraitUrl(url)) return false;
  return true;
}

export function buildPortraitSyncReport(): PortraitSyncReport {
  const seeds = getArtistSeeds();
  const metadataBySlug = new Map(
    readAllArtistMetadata().map((m) => [m.slug, m])
  );

  const found: PortraitSyncReport["found"] = [];
  const missing: string[] = [];
  const protectedSlugs: string[] = [];
  const bySource: Partial<Record<IngestedPortraitSource, number>> = {};
  const urlToSlugs = new Map<string, string[]>();
  const suspiciousAssignments: PortraitSyncReport["suspiciousAssignments"] = [];

  for (const seed of seeds) {
    if (isProtectedPortrait(seed.slug)) {
      protectedSlugs.push(seed.slug);
    }

    const metadata = metadataBySlug.get(seed.slug);
    const url = metadata?.resolvedImage?.url;
    const source = metadata?.resolvedImage?.source;

    if (hasDisplayPortrait(url) && source) {
      found.push({ slug: seed.slug, source, url: url! });
      bySource[source] = (bySource[source] ?? 0) + 1;

      const key = normalizeImageUrl(url!);
      const slugs = urlToSlugs.get(key) ?? [];
      slugs.push(seed.slug);
      urlToSlugs.set(key, slugs);

      if (isSuspiciousPortraitUrl(url!)) {
        suspiciousAssignments.push({
          slug: seed.slug,
          url: url!,
          reason: "URL matches suspicious portrait pattern",
        });
      }

      if (metadata?.resolvedImage?.source === "discogs" && metadata.discogs?.name) {
        if (!namesMatch(seed.name, metadata.discogs.name)) {
          suspiciousAssignments.push({
            slug: seed.slug,
            url: url!,
            reason: `Discogs name mismatch: "${metadata.discogs.name}" vs "${seed.name}"`,
          });
        }
      }
    } else if (isProtectedPortrait(seed.slug)) {
      const registry = getVerifiedImageRecord(seed.slug);
      const protectedUrl = registry?.imageUrl ?? url ?? "";
      if (protectedUrl) {
        const protectedSource =
          registry?.sourceType === "spotify" ? "spotify" : "official-website";
        found.push({
          slug: seed.slug,
          source: protectedSource,
          url: protectedUrl,
        });
        bySource[protectedSource] = (bySource[protectedSource] ?? 0) + 1;
      } else {
        missing.push(seed.slug);
      }
    } else {
      missing.push(seed.slug);
    }
  }

  const duplicateImages = [...urlToSlugs.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([key, slugs]) => ({
      url: key,
      slugs,
    }));

  for (const dup of duplicateImages) {
    for (const slug of dup.slugs) {
      suspiciousAssignments.push({
        slug,
        url: dup.url,
        reason: `Shared image with ${dup.slugs.filter((s) => s !== slug).join(", ")}`,
      });
    }
  }

  const coveragePercent = Math.round((found.length / seeds.length) * 100);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      artists: seeds.length,
      found: found.length,
      missing: missing.length,
      protected: protectedSlugs.length,
      coveragePercent,
      targetMet: coveragePercent >= COVERAGE_TARGET_PERCENT,
    },
    bySource,
    found,
    missing,
    protected: protectedSlugs,
    duplicateImages,
    suspiciousAssignments,
  };
}

export function formatPortraitSyncReport(report: PortraitSyncReport): string {
  const lines: string[] = [
    "# Portrait sync report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | --- |`,
    `| Artists | ${report.totals.artists} |`,
    `| Portraits found | ${report.totals.found} |`,
    `| Portraits missing | ${report.totals.missing} |`,
    `| Protected (verified) | ${report.totals.protected} |`,
    `| Coverage | ${report.totals.coveragePercent}% (target ≥${COVERAGE_TARGET_PERCENT}%) |`,
    `| Target met | ${report.totals.targetMet ? "yes" : "no"} |`,
    "",
    "## By source",
    "",
  ];

  for (const [source, count] of Object.entries(report.bySource).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  )) {
    lines.push(`- **${source}**: ${count}`);
  }

  lines.push("", "## Portraits missing", "");
  if (report.missing.length === 0) {
    lines.push("_None_");
  } else {
    for (const slug of report.missing) {
      lines.push(`- ${slug}`);
    }
  }

  lines.push("", "## Duplicate images", "");
  if (report.duplicateImages.length === 0) {
    lines.push("_None_");
  } else {
    for (const dup of report.duplicateImages) {
      lines.push(`- \`${dup.url}\` → ${dup.slugs.join(", ")}`);
    }
  }

  lines.push("", "## Suspicious assignments", "");
  if (report.suspiciousAssignments.length === 0) {
    lines.push("_None_");
  } else {
    const seen = new Set<string>();
    for (const item of report.suspiciousAssignments) {
      const key = `${item.slug}:${item.reason}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- **${item.slug}**: ${item.reason}`);
    }
  }

  return lines.join("\n");
}
