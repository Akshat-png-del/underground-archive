#!/usr/bin/env npx tsx
/**
 * Full catalog portrait coverage report.
 * Usage: npx tsx scripts/verify-full-portrait-coverage.ts
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import manualReview from "../src/content/artists/manual-review-portraits.json";
import { getCurationTier } from "../src/lib/archive/curation/tiers";
import { resolveArtistImage } from "../src/lib/archive/images/apply";
import { getVerifiedImageRecord } from "../src/content/artists/images/verified";
import { isGenrePortraitUrl } from "../src/lib/ingestion/portrait-sources";

const MIN_BYTES = 500;
const MANUAL_SLUGS = new Set(manualReview.artists.map((a) => a.slug));

function absFromPublicPath(publicPath: string): string {
  return join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function portraitSourceLabel(slug: string): string {
  const verified = getVerifiedImageRecord(slug);
  if (verified) {
    if (verified.sourceType === "spotify") return "spotify-official";
    if (verified.sourceType === "resident-advisor") return "resident-advisor";
    if (verified.sourceType === "official-website") return "official-website";
    return verified.sourceType;
  }
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return "—";
  const url = artist.image?.url ?? artist.portrait ?? "";
  if (url.includes("spotify") || url.includes("scdn.co")) return "spotify-cdn";
  if (url.includes("yt3.ggpht.com")) return "youtube-channel";
  if (isGenrePortraitUrl(url)) return "genre-fallback";
  if (url.startsWith("/images/portraits/")) return "verified-local";
  return "editorial";
}

function confidenceLabel(slug: string): string {
  if (getVerifiedImageRecord(slug)) return "high";
  if (MANUAL_SLUGS.has(slug)) return "none";
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return "—";
  const { portrait } = resolveArtistImage(artist, artist.image);
  if (isGenrePortraitUrl(portrait)) return "none";
  return "medium";
}

function main() {
  const issues: string[] = [];
  const rows: string[] = [];
  const urlOwners = new Map<string, string[]>();

  let tier12Missing = 0;
  let genreFallback = 0;
  let verifiedCount = 0;
  let broken = 0;

  const sorted = [...artists].sort((a, b) => {
    const ta = getCurationTier(a.slug);
    const tb = getCurationTier(b.slug);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  for (const artist of sorted) {
    const tier = getCurationTier(artist.slug);
    const { portrait } = resolveArtistImage(artist, artist.image);
    const inProduction = !isGenrePortraitUrl(portrait) && portrait !== "/images/artist-fallback.svg";
    const needsManual = MANUAL_SLUGS.has(artist.slug);

    if (portrait.startsWith("/images/portraits/")) {
      const abs = absFromPublicPath(portrait);
      if (!existsSync(abs) || statSync(abs).size < MIN_BYTES) {
        issues.push(`${artist.slug}: broken local portrait`);
        broken++;
      }
    }

    if (isGenrePortraitUrl(portrait)) {
      genreFallback++;
      if (tier <= 2) tier12Missing++;
      if (!needsManual) {
        issues.push(`${artist.slug}: Tier ${tier} still on genre fallback`);
      }
    }

    if (getVerifiedImageRecord(artist.slug)) verifiedCount++;

    const owners = urlOwners.get(portrait) ?? [];
    owners.push(artist.slug);
    urlOwners.set(portrait, owners);

    const source = portraitSourceLabel(artist.slug);
    const confidence = confidenceLabel(artist.slug);

    rows.push(
      `| ${artist.name} | ${source} | ${confidence} | ${inProduction ? "Yes" : "No"} | ${needsManual ? "Yes" : "No"} |`
    );
  }

  for (const [url, slugs] of urlOwners) {
    if (slugs.length > 1 && !isGenrePortraitUrl(url)) {
      issues.push(`Duplicate portrait URL ${url}: ${slugs.join(", ")}`);
    }
  }

  const tier1 = artists.filter((a) => getCurationTier(a.slug) === 1);
  const tier2 = artists.filter((a) => getCurationTier(a.slug) === 2);
  const tier1Ok = tier1.filter((a) => {
    const { portrait } = resolveArtistImage(a, a.image);
    return !isGenrePortraitUrl(portrait);
  }).length;
  const tier2Ok = tier2.filter((a) => {
    const { portrait } = resolveArtistImage(a, a.image);
    return !isGenrePortraitUrl(portrait);
  }).length;

  const withoutPortrait = sorted.filter((artist) => {
    if (getVerifiedImageRecord(artist.slug)) return false;
    const { portrait } = resolveArtistImage(artist, artist.image);
    return isGenrePortraitUrl(portrait) || portrait === "/images/artist-fallback.svg";
  });

  const report = [
    "# Portrait Coverage Report (Full Catalog)",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Summary",
    "",
    `- Total artists: **${artists.length}**`,
    `- Verified registry portraits: **${verifiedCount}**`,
    `- Genre fallback (no portrait): **${genreFallback}**`,
    `- Broken local portraits: **${broken}**`,
    `- Manual review queue: **${MANUAL_SLUGS.size}**`,
    `- Tier 1 coverage: **${tier1Ok}/${tier1.length}** (${Math.round((tier1Ok / tier1.length) * 100)}%)`,
    `- Tier 2 coverage: **${tier2Ok}/${tier2.length}** (${Math.round((tier2Ok / tier2.length) * 100)}%)`,
    `- Catalog coverage: **${artists.length - genreFallback}/${artists.length}** (${Math.round(((artists.length - genreFallback) / artists.length) * 100)}%)`,
    "",
    "## Artists without portraits",
    "",
    "_No verified portrait; showing genre-specific placeholder in production._",
    "",
  ];

  if (withoutPortrait.length === 0) {
    report.push("_None — all catalog artists have a verified or editorial portrait._", "");
  } else {
    report.push(
      "| Artist | Slug | Tier | Placeholder | Manual review |",
      "| --- | --- | --- | --- | --- |"
    );
    for (const artist of withoutPortrait) {
      const tier = getCurationTier(artist.slug);
      const { portrait } = resolveArtistImage(artist, artist.image);
      report.push(
        `| ${artist.name} | ${artist.slug} | ${tier} | ${portrait} | ${MANUAL_SLUGS.has(artist.slug) ? "Yes" : "No"} |`
      );
    }
    report.push("");
  }

  report.push(
    "## Artist | Source | Confidence | In Production | Needs Manual Review",
    "",
    "| Artist | Source | Confidence | In Production | Needs Manual Review |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    ""
  );

  if (issues.length) {
    report.push("## Issues", "", ...issues.map((i) => `- ${i}`), "");
  } else {
    report.push("## Verification", "", "All automated checks passed.", "");
  }

  const outPath = join(process.cwd(), "reports/portrait-coverage-full.md");
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(outPath, report.join("\n"), "utf8");

  console.log(report.slice(0, 2500).join("\n"));
  console.log(`\nReport: ${outPath}`);

  if (broken > 0 || tier12Missing > MANUAL_SLUGS.size) {
    process.exitCode = 1;
  }
}

main();
