import { namesMatch, normalizeName } from "@/lib/archive/pipeline/validate";
import { fetchOpenGraphImage } from "./opengraph";
import { fetchSpotifyPortrait } from "./opengraph";
import { sleep } from "./http";

export type PortraitConfidence = "high" | "medium" | "low";

export type PortraitSourceKind =
  | "official-website"
  | "instagram"
  | "facebook"
  | "resident-advisor"
  | "discogs"
  | "bandcamp"
  | "soundcloud"
  | "boiler-room"
  | "hor-berlin"
  | "label-press"
  | "wikimedia-commons"
  | "spotify-official";

export interface PortraitResearchCandidate {
  source: PortraitSourceKind;
  sourceUrl: string;
  imageUrl: string;
  confidence: PortraitConfidence;
  matchedName?: string;
  notes?: string;
}

export interface ArtistResearchContext {
  slug: string;
  name: string;
  genres: string[];
  labels: string[];
  city: string;
  country: string;
  spotifyArtistId?: string;
  aliases?: string[];
}

export interface PortraitResearchResult {
  slug: string;
  name: string;
  found: boolean;
  accepted: boolean;
  candidate?: PortraitResearchCandidate;
  candidates: PortraitResearchCandidate[];
  notFoundReason?: string;
  manualDeepResearch?: boolean;
}

const FETCH_HEADERS = {
  "User-Agent": "UndergroundArchive/1.0 (portrait-research)",
  Accept: "text/html,application/xhtml+xml,application/json",
};

/** Curated official profiles — verified handles/pages only. */
export const CURATED_OFFICIAL_PROFILES: Record<
  string,
  { source: PortraitSourceKind; url: string; verifyHint?: string }[]
> = {
  "paula-temple": [
    { source: "official-website", url: "http://www.noisemanifesto.com" },
    { source: "instagram", url: "https://www.instagram.com/paulatemple" },
    { source: "facebook", url: "https://www.facebook.com/paulatempleofficial" },
    { source: "resident-advisor", url: "https://ra.co/dj/paulatemple" },
    { source: "discogs", url: "https://www.discogs.com/artist/Paula+Temple" },
    { source: "bandcamp", url: "https://noisemanifesto.bandcamp.com" },
    { source: "soundcloud", url: "https://soundcloud.com/paulatemple" },
  ],
  perc: [
    { source: "official-website", url: "https://perctrax.bandcamp.com" },
    { source: "instagram", url: "https://www.instagram.com/perctrax" },
    { source: "facebook", url: "https://www.facebook.com/PercTrax" },
    { source: "resident-advisor", url: "https://ra.co/dj/perc" },
    { source: "discogs", url: "https://www.discogs.com/artist/53980-Perc" },
    { source: "soundcloud", url: "https://soundcloud.com/perc" },
  ],
  "ancient-methods": [
    { source: "bandcamp", url: "https://ancientmethods.bandcamp.com" },
    { source: "instagram", url: "https://www.instagram.com/ancientmethods" },
    { source: "resident-advisor", url: "https://ra.co/dj/ancientmethods" },
    { source: "discogs", url: "https://www.discogs.com/artist/Ancient+Methods" },
    { source: "facebook", url: "https://www.facebook.com/ancientmethods" },
  ],
  surgeon: [
    { source: "official-website", url: "https://www.counterbalance.co.uk" },
    { source: "resident-advisor", url: "https://ra.co/dj/surgeon" },
    { source: "discogs", url: "https://www.discogs.com/artist/Surgeon" },
    { source: "bandcamp", url: "https://surgeon.bandcamp.com" },
    { source: "facebook", url: "https://www.facebook.com/surgeonuk" },
  ],
  "adam-x": [
    { source: "official-website", url: "https://www.traag.com" },
    { source: "resident-advisor", url: "https://ra.co/dj/adamx" },
    { source: "discogs", url: "https://www.discogs.com/artist/Adam+X" },
    { source: "bandcamp", url: "https://adamx.bandcamp.com" },
    { source: "facebook", url: "https://www.facebook.com/adamxtraag" },
  ],
  "sven-wittekind": [
    { source: "instagram", url: "https://www.instagram.com/svenwittekind" },
    { source: "facebook", url: "https://www.facebook.com/svenwittekind" },
    { source: "resident-advisor", url: "https://ra.co/dj/svenwittekind" },
    { source: "discogs", url: "https://www.discogs.com/artist/Sven+Wittekind" },
    { source: "soundcloud", url: "https://soundcloud.com/sven-wittekind" },
  ],
};

const MANUAL_DEEP_SLUGS = new Set(Object.keys(CURATED_OFFICIAL_PROFILES));

export function resolveSpotifyArtistId(ctx: ArtistResearchContext): string | undefined {
  return ctx.spotifyArtistId;
}

function nameMatchesArtist(expected: string, actual: string, aliases: string[] = []): boolean {
  if (namesMatch(expected, actual)) return true;
  const n = normalizeName(actual);
  return aliases.some((a) => normalizeName(a) === n);
}

function scoreFromSource(
  source: PortraitSourceKind,
  nameMatch: boolean,
  artistName: string,
  pageTitle?: string
): PortraitConfidence {
  if (!nameMatch) return "low";
  if (source === "spotify-official" || source === "discogs" || source === "resident-advisor") {
    return "high";
  }
  if (source === "official-website" || source === "bandcamp" || source === "wikimedia-commons") {
    return pageTitle && normalizeName(pageTitle).includes(normalizeName(artistName))
      ? "high"
      : "medium";
  }
  if (source === "instagram" || source === "facebook" || source === "soundcloud") {
    return "medium";
  }
  return "low";
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<title[^>]*>([^<]+)<\/title>/i) ??
      html.match(/property="og:title"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+property="og:title"/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function fetchDiscogsArtistImage(
  ctx: ArtistResearchContext
): Promise<PortraitResearchCandidate | null> {
  const searchUrl = `https://www.discogs.com/search/?q=${encodeURIComponent(ctx.name)}&type=artist`;
  try {
    const res = await fetch(searchUrl, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const path = html.match(/href="(\/artist\/\d+-[^"?#]+)"/)?.[1];
    if (!path) return null;
    const pageUrl = `https://www.discogs.com${path}`;
    const titleMatch = html.match(
      new RegExp(`href="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([^<]+)<`)
    );
    const matchedName = titleMatch?.[1]?.trim() ?? ctx.name;
    if (!nameMatchesArtist(ctx.name, matchedName, ctx.aliases)) return null;

    const og = await fetchOpenGraphImage(pageUrl);
    if (!og) return null;

    return {
      source: "discogs",
      sourceUrl: pageUrl,
      imageUrl: og,
      confidence: "high",
      matchedName,
      notes: "Discogs search match with name verification",
    };
  } catch {
    return null;
  }
}

async function fetchWikimediaPortrait(
  ctx: ArtistResearchContext
): Promise<PortraitResearchCandidate | null> {
  const q = encodeURIComponent(ctx.name);
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=5&prop=imageinfo&iiprop=url&format=json`,
      { headers: FETCH_HEADERS }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: { url: string }[] }> };
    };
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      const title = page.title ?? "";
      if (!/\.(jpg|jpeg|png|webp)$/i.test(title)) continue;
      if (!title.toLowerCase().includes(ctx.name.toLowerCase().split(" ")[0] ?? "")) continue;
      const url = page.imageinfo?.[0]?.url;
      if (!url) continue;
      return {
        source: "wikimedia-commons",
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        imageUrl: url,
        confidence: "medium",
        matchedName: ctx.name,
        notes: "Wikimedia Commons filename partial match — requires manual identity check",
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchSpotifyOfficial(
  ctx: ArtistResearchContext
): Promise<PortraitResearchCandidate | null> {
  const artistId = resolveSpotifyArtistId(ctx);
  if (!artistId) return null;

  const url = `https://open.spotify.com/artist/${artistId}`;
  try {
    const oembedRes = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!oembedRes.ok) return null;
    const data = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };
    if (!data.thumbnail_url) return null;
    if (!nameMatchesArtist(ctx.name, data.title ?? "", ctx.aliases)) return null;

    return {
      source: "spotify-official",
      sourceUrl: url,
      imageUrl: data.thumbnail_url,
      confidence: "high",
      matchedName: data.title,
      notes: "Spotify oEmbed artist photo with catalog ID + name match",
    };
  } catch {
    const portrait = await fetchSpotifyPortrait(artistId);
    if (!portrait) return null;
    return {
      source: "spotify-official",
      sourceUrl: url,
      imageUrl: portrait,
      confidence: "high",
      matchedName: ctx.name,
      notes: "Spotify OG/oEmbed with catalog ID",
    };
  }
}

async function fetchFromOfficialUrl(
  ctx: ArtistResearchContext,
  source: PortraitSourceKind,
  pageUrl: string
): Promise<PortraitResearchCandidate | null> {
  const og = await fetchOpenGraphImage(pageUrl);
  if (!og) return null;

  const title = await fetchPageTitle(pageUrl);
  const matchedName = title
    ? title.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim() ?? title
    : ctx.name;
  const nameOk = nameMatchesArtist(ctx.name, matchedName, ctx.aliases);

  let confidence = scoreFromSource(source, nameOk, ctx.name, title ?? undefined);
  if (source === "instagram" || source === "facebook") {
    if (!nameOk) return null;
  }

  return {
    source,
    sourceUrl: pageUrl,
    imageUrl: og,
    confidence,
    matchedName,
    notes: title ? `Page title: ${title}` : undefined,
  };
}

export async function researchArtistPortrait(
  ctx: ArtistResearchContext
): Promise<PortraitResearchResult> {
  const candidates: PortraitResearchCandidate[] = [];
  const manualDeepResearch = MANUAL_DEEP_SLUGS.has(ctx.slug);

  const spotify = await fetchSpotifyOfficial(ctx);
  if (spotify) candidates.push(spotify);
  await sleep(350);

  const curated = CURATED_OFFICIAL_PROFILES[ctx.slug] ?? [];
  for (const profile of curated) {
    const c = await fetchFromOfficialUrl(ctx, profile.source, profile.url);
    if (c) candidates.push(c);
    await sleep(350);
  }

  const discogs = await fetchDiscogsArtistImage(ctx);
  if (discogs) candidates.push(discogs);
  await sleep(400);

  const wiki = await fetchWikimediaPortrait(ctx);
  if (wiki) candidates.push(wiki);
  await sleep(300);

  const ranked = candidates.sort((a, b) => {
    const order: PortraitConfidence[] = ["high", "medium", "low"];
    const sourceOrder: PortraitSourceKind[] = [
      "spotify-official",
      "official-website",
      "instagram",
      "facebook",
      "resident-advisor",
      "discogs",
      "bandcamp",
      "soundcloud",
      "boiler-room",
      "hor-berlin",
      "label-press",
      "wikimedia-commons",
    ];
    const conf = order.indexOf(a.confidence) - order.indexOf(b.confidence);
    if (conf !== 0) return conf;
    return sourceOrder.indexOf(a.source) - sourceOrder.indexOf(b.source);
  });

  const best = ranked.find((c) => c.confidence === "high");
  const accepted = !!best;

  if (!ranked.length) {
    return {
      slug: ctx.slug,
      name: ctx.name,
      found: false,
      accepted: false,
      candidates: [],
      manualDeepResearch,
      notFoundReason: manualDeepResearch
        ? "No high-confidence portrait from curated official profiles; manual identity verification required"
        : "No official portrait found across website, social, RA, Discogs, Bandcamp, SoundCloud, or Wikimedia",
    };
  }

  return {
    slug: ctx.slug,
    name: ctx.name,
    found: true,
    accepted,
    candidate: best,
    candidates: ranked,
    manualDeepResearch,
    notFoundReason: accepted
      ? undefined
      : `Found ${ranked.length} candidate(s) but none met HIGH confidence threshold`,
  };
}
