import { artists } from "@/content/artists/all";
import { archiveSets } from "@/content/sets";
import { catalogTracks } from "@/content/tracks";
import type { Artist } from "@/types";
import { runArchiveAudit } from "@/lib/archive/audit";
import { getPromotedTier1SlugsFromDisk } from "@/lib/archive/curation/tier-promotions-server";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import { hasDisplayPortrait, resolveDisplayPortrait } from "@/lib/archive/images/apply";
import { runImageAudit } from "@/lib/archive/images/audit";
import { isBlockedImageUrl } from "@/lib/archive/images/validate";
import { SPOTIFY_ARTIST_ID_PATTERN, YOUTUBE_ID_PATTERN } from "@/lib/archive/pipeline/constants";
import { artistId } from "@/lib/archive/ids";
import { youtubeIdAllowedForArtist } from "@/lib/archive/verification";
import type {
  ArtistQARow,
  ImageStatus,
  QADashboardData,
  QADashboardSummary,
} from "@/lib/archive/qa-dashboard-types";

export type { ArtistQARow, QADashboardData, QADashboardFilter, QADashboardSummary } from "@/lib/archive/qa-dashboard-types";
export { filterQARows, imageStatusLabel } from "@/lib/archive/qa-dashboard-types";

function resolveImageStatus(artist: Artist): ImageStatus {
  if (artist.image?.verified) return "verified";
  const url = artist.portrait ?? artist.image?.url ?? "";
  if (url.includes("/images/genres/")) return "genre";
  if (url && url !== FALLBACK_IMAGE) {
    if (isBlockedImageUrl(url)) return "missing";
    if (/img\.youtube\.com/i.test(url)) return "editorial";
    return "editorial";
  }
  if (artist.image?.sourceType === "pending-review") return "pending-review";
  return "missing";
}

function isMissingBio(artist: Artist): boolean {
  const bio = artist.editorialBio?.origins?.trim() ?? "";
  return !bio || bio.includes("pending verification");
}

function isBrokenSpotify(artist: Artist): boolean {
  const id = artist.spotifyArtistId;
  const url = artist.externalLinks.spotify;
  if (id && !SPOTIFY_ARTIST_ID_PATTERN.test(id)) return true;
  if (url && !url.includes("open.spotify.com/artist/")) return true;
  if (id && url && !url.endsWith(id)) return true;
  return false;
}

function isBrokenYoutube(artist: Artist): boolean {
  for (const set of artist.essentialSets) {
    if (!YOUTUBE_ID_PATTERN.test(set.youtubeId)) return true;
    if (!youtubeIdAllowedForArtist(set.youtubeId, artist.slug)) return true;
  }
  return false;
}

function hasSuspiciousMedia(issueCodes: string[]): boolean {
  const suspicious = new Set([
    "YOUTUBE_CROSS_ARTIST",
    "TRACK_OWNER_MISMATCH",
    "SET_OWNER_MISMATCH",
    "TRACK_CONTAMINATION",
    "SET_CONTAMINATION",
    "YOUTUBE_MISMATCH",
  ]);
  return issueCodes.some((c) => suspicious.has(c));
}

function tierCompleteness(row: ArtistQARow): number {
  const checks: boolean[] = [
    !row.flags.missingBio,
    row.trackCount > 0,
    row.imageStatus === "verified" ||
      row.imageStatus === "editorial" ||
      row.imageStatus === "genre",
    !row.flags.brokenSpotify,
    !row.flags.brokenYoutube,
    !row.flags.suspiciousMedia,
  ];

  if (row.tier <= 2) checks.push(row.setCount > 0);

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function buildArtistRow(artist: Artist, duplicateSlugs: Set<string>, auditIssues: string[]): ArtistQARow {
  const id = artistId(artist.slug);
  const trackCount = catalogTracks.filter((t) => t.artistId === id).length;
  const setCount = archiveSets.filter((s) => s.artistId === id).length;
  const imageStatus = resolveImageStatus(artist);
  const missingImage = !hasDisplayPortrait(artist);
  const missingBio = isMissingBio(artist);
  const brokenSpotify = isBrokenSpotify(artist);
  const brokenYoutube = isBrokenYoutube(artist);
  const suspiciousMedia = hasSuspiciousMedia(auditIssues);

  const row: ArtistQARow = {
    slug: artist.slug,
    name: artist.name,
    tier: artist.curationTier,
    verificationStatus: artist.verificationStatus,
    imageStatus,
    portraitUrl: resolveDisplayPortrait(artist),
    trackCount,
    setCount,
    promoted: getPromotedTier1SlugsFromDisk().includes(artist.slug),
    flags: {
      missingImage,
      missingSets: setCount === 0,
      missingTracks: trackCount === 0,
      missingBio,
      brokenSpotify,
      brokenYoutube,
      suspiciousMedia,
      isDuplicate: duplicateSlugs.has(artist.slug),
    },
    issueCodes: auditIssues,
    completeness: 0,
  };

  row.completeness = tierCompleteness(row);
  return row;
}

export function runQADashboard(): QADashboardData {
  const audit = runArchiveAudit();
  const imageAudit = runImageAudit();
  const duplicateSlugs = new Set(audit.duplicateSlugs);
  const issueMap = new Map(audit.artists.map((a) => [a.slug, a.issues.map((i) => i.code)]));

  const rows = artists.map((a) =>
    buildArtistRow(a, duplicateSlugs, issueMap.get(a.slug) ?? [])
  );

  const qualityScore =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.completeness, 0) / rows.length);

  const summary: QADashboardSummary = {
    totalArtists: rows.length,
    tier1: rows.filter((r) => r.tier === 1).length,
    tier2: rows.filter((r) => r.tier === 2).length,
    tier3: rows.filter((r) => r.tier === 3).length,
    missingImages: rows.filter((r) => r.flags.missingImage).length,
    missingSets: rows.filter((r) => r.flags.missingSets).length,
    missingTracks: rows.filter((r) => r.flags.missingTracks).length,
    brokenYoutube: rows.filter((r) => r.flags.brokenYoutube).length,
    brokenSpotify: rows.filter((r) => r.flags.brokenSpotify).length,
    missingBiographies: rows.filter((r) => r.flags.missingBio).length,
    duplicateArtists: duplicateSlugs.size,
    suspiciousMedia: rows.filter((r) => r.flags.suspiciousMedia).length,
    qualityScore,
    promotedCount: getPromotedTier1SlugsFromDisk().length,
    verifiedImages: imageAudit.totals.verified,
    pendingReviewImages: imageAudit.totals.awaitingVerification,
    suspiciousImages: imageAudit.totals.suspicious,
    imageCoveragePercent: imageAudit.totals.coveragePercent,
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    duplicateSlugs: audit.duplicateSlugs,
    artists: rows.sort((a, b) => a.completeness - b.completeness),
    audit: { duplicateSlugs: audit.duplicateSlugs },
  };
}
