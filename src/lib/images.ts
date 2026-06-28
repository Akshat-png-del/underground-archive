/** YouTube thumbnail URLs from official performance uploads */
export function ytThumb(videoId: string, size: "hq" | "max" = "hq") {
  const file = size === "max" ? "maxresdefault" : "hqdefault";
  return `https://img.youtube.com/vi/${videoId}/${file}.jpg`;
}

export const IMAGE_FALLBACK = "/images/artist-fallback.svg";
