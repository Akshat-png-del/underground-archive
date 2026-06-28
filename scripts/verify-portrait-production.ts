#!/usr/bin/env npx tsx
/**
 * Verify researched portraits in production and emit reports/portrait-production.md
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import {
  RESEARCHED_VERIFIED_PORTRAITS,
  researchedPortraitPath,
} from "../src/content/artists/images/researched-portraits";
import { getVerifiedImageRecord } from "../src/content/artists/images/verified";
import { resolveArtistImage } from "../src/lib/archive/images/apply";
import { validateVerifiedImageRecord } from "../src/lib/archive/images/validate";

const MIN_BYTES = 500;

function absFromPublicPath(publicPath: string): string {
  return join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function main() {
  const bySlug = new Map(artists.map((a) => [a.slug, a]));
  const urlOwners = new Map<string, string[]>();
  const rows: string[] = [];
  const issues: string[] = [];

  for (const record of RESEARCHED_VERIFIED_PORTRAITS) {
    const artist = bySlug.get(record.slug);
    const active = !!artist;
    const source =
      record.sourceType === "spotify"
        ? "spotify-official"
        : record.sourceType === "resident-advisor"
          ? "resident-advisor"
          : record.sourceType;

    const abs = absFromPublicPath(record.imageUrl);
    const fileOk = existsSync(abs) && statSync(abs).size >= MIN_BYTES;

    if (!fileOk) {
      issues.push(`${record.slug}: missing or corrupt local portrait`);
    }

    const owners = urlOwners.get(record.imageUrl) ?? [];
    owners.push(record.slug);
    urlOwners.set(record.imageUrl, owners);

    if (artist) {
      const registryIssues = validateVerifiedImageRecord(record, artist);
      if (registryIssues.length) {
        issues.push(`${record.slug}: registry validation — ${registryIssues.join("; ")}`);
      }

      const { portrait } = resolveArtistImage(artist, artist.image);
      if (portrait.includes("/images/genres/")) {
        issues.push(`${record.slug}: still using genre fallback in production`);
      }
      if (!portrait.includes("/images/portraits/researched/") && !portrait.startsWith("http")) {
        issues.push(`${record.slug}: unexpected portrait URL ${portrait}`);
      }
      if (!getVerifiedImageRecord(record.slug)) {
        issues.push(`${record.slug}: not in verified registry`);
      }
    }

    rows.push(
      `| ${record.artistName} | ${source} | high | ${active ? "Yes" : "No"} |`
    );
  }

  for (const [url, slugs] of urlOwners) {
    if (slugs.length > 1) {
      issues.push(`Duplicate portrait URL ${url}: ${slugs.join(", ")}`);
    }
  }

  const report = [
    "# Portrait Production Report",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Summary",
    "",
    `- Researched HIGH-confidence portraits: **${RESEARCHED_VERIFIED_PORTRAITS.length}**`,
    `- Active in production catalog: **${rows.filter((r) => r.endsWith("| Yes |")).length}**`,
    `- Verification issues: **${issues.length}**`,
    "",
    "## Artist | Source | Confidence | Active in Production",
    "",
    "| Artist | Source | Confidence | Active in Production |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ];

  if (issues.length) {
    report.push("## Issues", "", ...issues.map((i) => `- ${i}`), "");
  } else {
    report.push("## Verification", "", "All checks passed.", "");
  }

  const outDir = join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "portrait-production.md");
  writeFileSync(outPath, report.join("\n"), "utf8");

  console.log(report.join("\n"));
  console.log(`\nReport: ${outPath}`);

  if (issues.length) process.exitCode = 1;
}

main();
