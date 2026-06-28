import { fetchJson } from "./http";
import { getYoutubeApiKey } from "./config";
import type { YoutubeIngested } from "./types";

interface YoutubeSearchResponse {
  items?: {
    id: { channelId: string };
    snippet: {
      title: string;
      thumbnails?: { high?: { url: string }; medium?: { url: string } };
    };
  }[];
}

interface YoutubeChannelResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      customUrl?: string;
      thumbnails?: { high?: { url: string } };
    };
  }[];
}

export function isYoutubeConfigured(): boolean {
  return !!getYoutubeApiKey();
}

export async function fetchYoutubeChannel(name: string): Promise<YoutubeIngested> {
  const key = getYoutubeApiKey();
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is required");
  }

  const q = encodeURIComponent(name);
  const search = await fetchJson<YoutubeSearchResponse>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${q}&maxResults=3&key=${key}`,
    { provider: "youtube" }
  );

  const channelId = search.items?.[0]?.id.channelId ?? null;
  if (!channelId) {
    return {
      channelId: null,
      channelTitle: null,
      channelUrl: null,
      customUrl: null,
      thumbnailUrl: search.items?.[0]?.snippet.thumbnails?.high?.url ?? null,
    };
  }

  const channel = await fetchJson<YoutubeChannelResponse>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${key}`,
    { provider: "youtube" }
  );

  const item = channel.items?.[0];
  const customUrl = item?.snippet.customUrl;
  const channelUrl = customUrl
    ? `https://www.youtube.com/${customUrl}`
    : `https://www.youtube.com/channel/${channelId}`;

  return {
    channelId,
    channelTitle: item?.snippet.title ?? search.items?.[0]?.snippet.title ?? null,
    channelUrl,
    customUrl: customUrl ?? null,
    thumbnailUrl:
      item?.snippet.thumbnails?.high?.url ??
      search.items?.[0]?.snippet.thumbnails?.high?.url ??
      null,
  };
}
