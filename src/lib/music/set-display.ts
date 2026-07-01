import { isValidYoutubeId } from "@/lib/archive/pipeline/validate";

import { ytThumb } from "@/lib/images";

/** True when a set has a renderable YouTube embed (11-char ID). */
export function canShowSetVideoEmbed(youtubeId?: string | null): boolean {
  const id = youtubeId?.trim();
  return !!id && isValidYoutubeId(id);
}

/** Thumbnail for set cards — never an embed (avoids YouTube chrome). */
export function setThumbnailUrl(thumbnail?: string | null, youtubeId?: string | null): string {
  if (thumbnail?.trim()) return thumbnail.trim();
  if (canShowSetVideoEmbed(youtubeId)) return ytThumb(youtubeId!.trim());
  return "";
}
