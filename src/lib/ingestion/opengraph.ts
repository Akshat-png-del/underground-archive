/** Fetch og:image from an official artist profile page (Spotify, YouTube, etc.). */
export async function fetchOpenGraphImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "UndergroundArchive/1.0 (metadata-sync)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/property="og:image"\s+content="([^"]+)"/) ??
      html.match(/content="([^"]+)"\s+property="og:image"/) ??
      html.match(/name="twitter:image"\s+content="([^"]+)"/);
    const url = match?.[1]?.trim();
    if (!url || !url.startsWith("http")) return null;
    return url;
  } catch {
    return null;
  }
}

export function spotifyArtistPageUrl(artistId: string): string {
  return `https://open.spotify.com/artist/${artistId}`;
}

export async function fetchSpotifyPortrait(artistId: string): Promise<string | null> {
  const oembed = await fetchSpotifyOembedThumbnail(artistId);
  if (oembed) return oembed;
  return fetchOpenGraphImage(spotifyArtistPageUrl(artistId));
}

async function fetchSpotifyOembedThumbnail(artistId: string): Promise<string | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
      spotifyArtistPageUrl(artistId)
    )}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    const thumb = data.thumbnail_url?.trim();
    return thumb?.startsWith("http") ? thumb : null;
  } catch {
    return null;
  }
}

export async function fetchYoutubeChannelPortrait(channelUrl: string): Promise<string | null> {
  return fetchOpenGraphImage(channelUrl);
}
