import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { namesMatch } from "@/lib/archive/pipeline/validate";
import {
  isBlockedImageUrl,
  isSuspiciousPortraitUrl,
  isValidImageUrl,
} from "@/lib/archive/images/validate";
import { fetchDiscogsArtist, isDiscogsConfigured } from "./discogs";
import { fetchOpenGraphImage, fetchSpotifyPortrait, fetchYoutubeChannelPortrait } from "./opengraph";
import {
  fetchSpotifyArtistById,
  isSpotifyConfigured,
  searchSpotifyArtist,
} from "./spotify";
import { sleep } from "./http";
import type { IngestedPortraitSource } from "./types";

const FETCH_HEADERS = {
  "User-Agent": "UndergroundArchive/1.0 (portrait-sync)",
  Accept: "text/html,application/xhtml+xml",
};

export interface PortraitContext {
  slug: string;
  name: string;
  spotifyArtistId?: string;
  residentAdvisor?: string;
  website?: string;
  youtube?: string;
}

export interface PortraitCandidate {
  url: string;
  source: IngestedPortraitSource;
  sourceUrl: string;
  matchedName?: string;
}

export const PORTRAIT_SOURCE_PRIORITY: Record<IngestedPortraitSource, number> = {
  spotify: 1,
  discogs: 2,
  beatport: 3,
  "resident-advisor": 4,
  "official-website": 5,
  musicbrainz: 6,
  youtube: 7,
};

export function isGenrePortraitUrl(url: string): boolean {
  return /\/images\/genres\//.test(url) || /artist-fallback\.svg/.test(url);
}

export async function fetchPageHtml(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function validatePortraitUrl(url: string): Promise<boolean> {
  if (!isValidImageUrl(url) || isBlockedImageUrl(url) || isSuspiciousPortraitUrl(url)) {
    return false;
  }
  if (isGenrePortraitUrl(url)) return false;
  try {
    let res = await fetch(url, {
      method: "HEAD",
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok || res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        headers: { ...FETCH_HEADERS, Range: "bytes=0-0" },
        redirect: "follow",
      });
    }
    if (!res.ok) return false;
    const ct = res.headers.get("content-type");
    if (ct && !ct.startsWith("image/") && !ct.includes("octet-stream")) return false;
    return true;
  } catch {
    return false;
  }
}

async function acceptCandidate(candidate: PortraitCandidate): Promise<PortraitCandidate | null> {
  if (!(await validatePortraitUrl(candidate.url))) return null;
  return candidate;
}

export async function scrapeSpotifyArtistId(name: string): Promise<string | null> {
  const html = await fetchPageHtml(
    `https://open.spotify.com/search/${encodeURIComponent(name)}/artists`
  );
  if (!html) return null;
  const match = html.match(/spotify:artist:([a-zA-Z0-9]{22})/);
  return match?.[1] ?? null;
}

export async function fetchSpotifyPortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  let artistId = ctx.spotifyArtistId;

  if (!artistId) {
    if (isSpotifyConfigured()) {
      const searched = await searchSpotifyArtist(ctx.name);
      artistId = searched?.artistId;
      if (searched?.imageUrl) {
        const candidate = await acceptCandidate({
          url: searched.imageUrl,
          source: "spotify",
          sourceUrl: searched.url,
          matchedName: searched.name,
        });
        if (candidate) return candidate;
      }
    } else {
      artistId = (await scrapeSpotifyArtistId(ctx.name)) ?? undefined;
    }
  }

  if (!artistId) return null;

  if (isSpotifyConfigured()) {
    try {
      const artist = await fetchSpotifyArtistById(artistId);
      if (artist.imageUrl) {
        const candidate = await acceptCandidate({
          url: artist.imageUrl,
          source: "spotify",
          sourceUrl: artist.url,
          matchedName: artist.name,
        });
        if (candidate) return candidate;
      }
    } catch {
      // fall through to oEmbed / OG
    }
  }

  const portraitUrl = await fetchSpotifyPortrait(artistId);
  if (!portraitUrl) return null;

  return acceptCandidate({
    url: portraitUrl,
    source: "spotify",
    sourceUrl: `https://open.spotify.com/artist/${artistId}`,
    matchedName: ctx.name,
  });
}

export async function fetchDiscogsPortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  if (isDiscogsConfigured()) {
    try {
      const ingested = await fetchDiscogsArtist(ctx.name);
      if (!ingested) return null;
      const url = ingested.imageUrl ?? ingested.thumbUrl;
      if (!url) return null;
      if (!namesMatch(ctx.name, ingested.name)) return null;
      return acceptCandidate({
        url,
        source: "discogs",
        sourceUrl: ingested.uri ?? `https://www.discogs.com/artist/${ingested.id}`,
        matchedName: ingested.name,
      });
    } catch {
      return null;
    }
  }

  const searchUrl = `https://www.discogs.com/search/?q=${encodeURIComponent(ctx.name)}&type=artist`;
  const html = await fetchPageHtml(searchUrl);
  if (!html) return null;

  const artistPath = html.match(/href="(\/artist\/\d+-[^"?#]+)"/)?.[1];
  if (!artistPath) return null;

  const pageUrl = `https://www.discogs.com${artistPath}`;
  const og = await fetchOpenGraphImage(pageUrl);
  if (!og) return null;

  const titleMatch = html.match(
    new RegExp(`href="${artistPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([^<]+)<`)
  );
  const matchedName = titleMatch?.[1]?.trim() ?? ctx.name;
  if (!namesMatch(ctx.name, matchedName)) return null;

  return acceptCandidate({
    url: og,
    source: "discogs",
    sourceUrl: pageUrl,
    matchedName,
  });
}

export async function fetchBeatportPortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  const searchUrl = `https://www.beatport.com/search?q=${encodeURIComponent(ctx.name)}`;
  const html = await fetchPageHtml(searchUrl);
  if (!html) return null;

  const artistPath = html.match(/href="(\/artist\/[^"?#]+\/\d+)"/)?.[1];
  if (!artistPath) return null;

  const pageUrl = `https://www.beatport.com${artistPath}`;
  const og = await fetchOpenGraphImage(pageUrl);
  if (!og) return null;

  const slugName = artistPath.split("/")[2]?.replace(/-/g, " ") ?? ctx.name;
  if (!namesMatch(ctx.name, slugName) && !slugName.toLowerCase().includes(ctx.name.toLowerCase().split(" ")[0] ?? "")) {
    return null;
  }

  return acceptCandidate({
    url: og,
    source: "beatport",
    sourceUrl: pageUrl,
    matchedName: slugName,
  });
}

function raSlugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export async function fetchRAPortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  const candidates = [
    ctx.residentAdvisor,
    `https://ra.co/dj/${ctx.slug.replace(/-/g, "")}`,
    `https://ra.co/dj/${raSlugFromName(ctx.name)}`,
  ].filter(Boolean) as string[];

  for (const pageUrl of [...new Set(candidates)]) {
    const og = await fetchOpenGraphImage(pageUrl);
    if (!og) continue;
    const accepted = await acceptCandidate({
      url: og,
      source: "resident-advisor",
      sourceUrl: pageUrl,
      matchedName: ctx.name,
    });
    if (accepted) return accepted;
    await sleep(200);
  }

  const searchHtml = await fetchPageHtml(
    `https://ra.co/search?terms=${encodeURIComponent(ctx.name)}`
  );
  if (!searchHtml) return null;

  const djPath = searchHtml.match(/href="(\/dj\/[^"?#]+)"/)?.[1];
  if (!djPath) return null;

  const pageUrl = `https://ra.co${djPath}`;
  const og = await fetchOpenGraphImage(pageUrl);
  if (!og) return null;

  return acceptCandidate({
    url: og,
    source: "resident-advisor",
    sourceUrl: pageUrl,
    matchedName: ctx.name,
  });
}

export async function fetchWebsitePortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  if (!ctx.website) return null;
  const og = await fetchOpenGraphImage(ctx.website);
  if (!og) return null;
  return acceptCandidate({
    url: og,
    source: "official-website",
    sourceUrl: ctx.website,
    matchedName: ctx.name,
  });
}

export async function fetchYoutubePortraitCandidate(
  ctx: PortraitContext
): Promise<PortraitCandidate | null> {
  if (!ctx.youtube) return null;
  const url = await fetchYoutubeChannelPortrait(ctx.youtube);
  if (!url) return null;
  return acceptCandidate({
    url,
    source: "youtube",
    sourceUrl: ctx.youtube,
    matchedName: ctx.name,
  });
}

/** Try every source; collect all successful candidates (does not stop on failure). */
export async function collectPortraitCandidates(
  ctx: PortraitContext
): Promise<PortraitCandidate[]> {
  const fetchers: (() => Promise<PortraitCandidate | null>)[] = [
    () => fetchSpotifyPortraitCandidate(ctx),
    () => fetchDiscogsPortraitCandidate(ctx),
    () => fetchBeatportPortraitCandidate(ctx),
    () => fetchRAPortraitCandidate(ctx),
    () => fetchWebsitePortraitCandidate(ctx),
    () => fetchYoutubePortraitCandidate(ctx),
  ];

  const found: PortraitCandidate[] = [];

  for (const fetcher of fetchers) {
    try {
      const candidate = await fetcher();
      if (candidate) found.push(candidate);
    } catch {
      // continue to next source
    }
    await sleep(280);
  }

  return found.sort(
    (a, b) => PORTRAIT_SOURCE_PRIORITY[a.source] - PORTRAIT_SOURCE_PRIORITY[b.source]
  );
}

export function pickBestPortraitCandidate(
  candidates: PortraitCandidate[]
): PortraitCandidate | null {
  return candidates[0] ?? null;
}
