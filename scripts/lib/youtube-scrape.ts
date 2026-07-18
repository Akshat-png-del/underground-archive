import { sleep } from "../../src/lib/ingestion/http";

const UA = "UndergroundArchive/1.0 (catalog-expand)";

const VENUE_PATTERNS: { pattern: RegExp; venue: string }[] = [
  { pattern: /boiler\s*room/i, venue: "Boiler Room" },
  { pattern: /h[oö]r\s*berlin|hör/i, venue: "HÖR Berlin" },
  { pattern: /intercell/i, venue: "Intercell" },
  { pattern: /possession/i, venue: "Possession" },
  { pattern: /teletech/i, venue: "Teletech" },
  { pattern: /stone\s*techno/i, venue: "Stone Techno" },
  { pattern: /awakenings/i, venue: "Awakenings" },
  { pattern: /vault\s*sessions?/i, venue: "Vault Sessions" },
  { pattern: /\bkntxt\b/i, venue: "KNTXT" },
  { pattern: /tomorrowland/i, venue: "Tomorrowland" },
  { pattern: /exit\s*festival/i, venue: "EXIT Festival" },
  { pattern: /time\s*warp/i, venue: "Time Warp" },
  { pattern: /exhale/i, venue: "Exhale" },
  { pattern: /dekmantel/i, venue: "Dekmantel" },
  { pattern: /verknipt/i, venue: "Verknipt" },
  { pattern: /terminal\s*v/i, venue: "Terminal V" },
  { pattern: /unreal/i, venue: "Unreal" },
  { pattern: /rotterdam\s*rave/i, venue: "Rotterdam Rave" },
  { pattern: /gotec/i, venue: "Gotec Club" },
];

export interface YoutubeSetCandidate {
  youtubeId: string;
  title: string;
  venue: string;
  year: number;
}

function normalizeArtist(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function artistInTitle(artistName: string, title: string): boolean {
  const norm = normalizeArtist(artistName);
  const titleNorm = title.toLowerCase();
  const parts = norm.split(/\s+/).filter((p) => p.length > 2);
  if (parts.length === 0) return titleNorm.includes(norm);
  return parts.every((p) => titleNorm.includes(p));
}

function inferVenue(title: string): string | null {
  for (const { pattern, venue } of VENUE_PATTERNS) {
    if (pattern.test(title)) return venue;
  }
  return null;
}

function extractYear(title: string): number {
  const m = title.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

async function fetchYoutubeOembed(videoId: string): Promise<{ title: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ? { title: data.title } : null;
  } catch {
    return null;
  }
}

export async function searchYoutubeSets(
  artistName: string,
  queries: string[],
  maxSets: number,
  existingIds: Set<string>
): Promise<YoutubeSetCandidate[]> {
  const found: YoutubeSetCandidate[] = [];
  const seen = new Set<string>(existingIds);

  for (const query of queries) {
    if (found.length >= maxSets) break;
    await sleep(400);
    const q = encodeURIComponent(query);
    const html = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    }).then((r) => (r.ok ? r.text() : ""));

    const videoIds: string[] = [];
    for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
      if (!seen.has(m[1]) && !videoIds.includes(m[1])) {
        videoIds.push(m[1]);
      }
      if (videoIds.length >= 8) break;
    }

    for (const videoId of videoIds) {
      if (found.length >= maxSets) break;
      if (seen.has(videoId)) continue;
      await sleep(300);
      const oembed = await fetchYoutubeOembed(videoId);
      if (!oembed) continue;
      const title = oembed.title;
      if (!artistInTitle(artistName, title)) continue;
      const venue = inferVenue(title);
      if (!venue) continue;
      // Skip shorts / clips under 15 min in title hints
      if (/shorts|clip|teaser|preview/i.test(title) && !/full|set|hour|live/i.test(title)) {
        continue;
      }
      seen.add(videoId);
      found.push({
        youtubeId: videoId,
        title,
        venue,
        year: extractYear(title),
      });
    }
  }

  return found;
}

export function buildSetSearchQueries(artistName: string): string[] {
  return [
    `${artistName} Boiler Room`,
    `${artistName} HÖR`,
    `${artistName} Intercell`,
    `${artistName} Awakenings full set`,
    `${artistName} Teletech`,
    `${artistName} Possession`,
    `${artistName} full set`,
    `${artistName} live set`,
    `${artistName} DJ set`,
    `${artistName} Exhale`,
    `${artistName} Verknipt`,
    `${artistName} Time Warp`,
  ];
}
