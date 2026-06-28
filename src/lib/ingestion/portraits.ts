import { getVerifiedImageRecord } from "@/content/artists/images/verified";
import { getResearchBySlug } from "@/content/artists/research";
import { fieldVerified } from "@/content/artists/research/types";
import { coreArtists } from "@/content/artists/data";
import { catalogArtists } from "@/content/artists/catalog";
import { bulkCatalogArtists } from "@/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "@/content/artists/catalog-expansion";
import type { ArtistIngestedMetadata, ResolvedIngestedImage } from "./types";
import {
  collectPortraitCandidates,
  isGenrePortraitUrl,
  pickBestPortraitCandidate,
  PORTRAIT_SOURCE_PRIORITY,
  type PortraitCandidate,
  type PortraitContext,
} from "./portrait-sources";

const rawArtists = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
];

export function getPortraitContext(slug: string, name: string): PortraitContext {
  const raw = rawArtists.find((a) => a.slug === slug);
  const research = getResearchBySlug(slug);

  return {
    slug,
    name: raw?.name ?? name,
    spotifyArtistId: raw?.spotifyArtistId,
    residentAdvisor:
      raw?.externalLinks?.residentAdvisor ?? research?.residentAdvisor?.url,
    website: research?.website?.url ?? raw?.externalLinks?.website,
    youtube: raw?.externalLinks?.youtube ?? research?.youtube?.url,
  };
}

/** Verified registry or research portrait — never overwrite during sync. */
export function isProtectedPortrait(slug: string): boolean {
  const registry = getVerifiedImageRecord(slug);
  if (registry?.imageVerified) return true;

  const research = getResearchBySlug(slug);
  if (research?.image && fieldVerified(research.image.confidence)) return true;

  return false;
}

function shouldUpdateResolvedImage(
  existing: ResolvedIngestedImage | undefined,
  next: PortraitCandidate
): boolean {
  if (!existing?.url || isGenrePortraitUrl(existing.url)) return true;

  const existingPriority = PORTRAIT_SOURCE_PRIORITY[existing.source] ?? 99;
  const nextPriority = PORTRAIT_SOURCE_PRIORITY[next.source] ?? 99;
  return nextPriority <= existingPriority;
}

export interface PortraitSyncResult {
  slug: string;
  status: "found" | "protected" | "missing" | "unchanged";
  source?: ResolvedIngestedImage["source"];
  url?: string;
  candidatesTried: number;
}

export async function syncArtistPortrait(
  metadata: ArtistIngestedMetadata
): Promise<PortraitSyncResult> {
  if (isProtectedPortrait(metadata.slug)) {
    return {
      slug: metadata.slug,
      status: "protected",
      source: metadata.resolvedImage?.source,
      url: metadata.resolvedImage?.url,
      candidatesTried: 0,
    };
  }

  const ctx = getPortraitContext(metadata.slug, metadata.name);
  const candidates = await collectPortraitCandidates(ctx);
  const best = pickBestPortraitCandidate(candidates);

  if (!best) {
    return {
      slug: metadata.slug,
      status: "missing",
      candidatesTried: candidates.length,
    };
  }

  const next: ResolvedIngestedImage = {
    url: best.url,
    source: best.source,
    sourceUrl: best.sourceUrl,
  };

  if (!shouldUpdateResolvedImage(metadata.resolvedImage, best)) {
    return {
      slug: metadata.slug,
      status: "unchanged",
      source: metadata.resolvedImage?.source,
      url: metadata.resolvedImage?.url,
      candidatesTried: candidates.length,
    };
  }

  const now = new Date().toISOString();
  metadata.resolvedImage = next;
  metadata.updatedAt = now;

  if (best.source === "spotify") {
    const artistId =
      ctx.spotifyArtistId ??
      best.sourceUrl.match(/artist\/([a-zA-Z0-9]{22})/)?.[1] ??
      metadata.spotify?.artistId;
    if (artistId) {
      metadata.spotify = {
        artistId,
        name: best.matchedName ?? ctx.name,
        url: best.sourceUrl,
        genres: metadata.spotify?.genres ?? [],
        followers: metadata.spotify?.followers ?? 0,
        popularity: metadata.spotify?.popularity ?? 0,
        imageUrl: best.url,
        imageUrls: [best.url],
        relatedArtists: metadata.spotify?.relatedArtists ?? [],
      };
      metadata.sources.spotify = { syncedAt: now, status: "ok" };
    }
  }

  if (best.source === "discogs") {
    metadata.sources.discogs = { syncedAt: now, status: "ok" };
  }
  if (best.source === "beatport") {
    metadata.sources.beatport = { syncedAt: now, status: "ok" };
  }
  if (best.source === "resident-advisor") {
    metadata.sources.residentAdvisor = { syncedAt: now, status: "ok" };
  }
  if (best.source === "official-website") {
    metadata.sources.website = { syncedAt: now, status: "ok" };
  }
  if (best.source === "youtube") {
    metadata.sources.youtube = { syncedAt: now, status: "ok" };
  }

  return {
    slug: metadata.slug,
    status: "found",
    source: best.source,
    url: best.url,
    candidatesTried: candidates.length,
  };
}
