"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTExIi8+PC9zdmc+";

/** Session cache of successfully decoded image URLs — skips fade/pulse on revisit. */
const warmImageUrls = new Set<string>();

export function markImageWarm(url: string) {
  if (url) warmImageUrls.add(url);
}

export function isImageWarm(url: string): boolean {
  return warmImageUrls.has(url);
}

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
  fallbacks?: string[];
  wrapperClassName?: string;
  /** When true (default), never render genre/artist-fallback placeholders — hide instead. */
  hidePlaceholder?: boolean;
};

function isSvgOrLocal(src: string): boolean {
  return src.startsWith("/") || src.startsWith("data:") || src.endsWith(".svg");
}

function isUnoptimizedRemote(src: string): boolean {
  return (
    src.includes("scdn.co") ||
    src.includes("spotifycdn.com") ||
    src.includes("ggpht.com") ||
    src.includes("ytimg.com") ||
    src.includes("youtube.com") ||
    src.includes("discogs.com") ||
    src.includes("ra.co")
  );
}

function isPlaceholderSrc(url: string): boolean {
  return (
    !url.trim() ||
    url.includes("artist-fallback") ||
    url.includes("/images/genres/") ||
    url.includes("hero-atmospheric")
  );
}

function SafeImageInner({
  src,
  alt,
  className,
  wrapperClassName,
  fallbackSrc,
  fallbacks = [],
  hidePlaceholder = true,
  fill,
  sizes,
  priority,
  loading,
  onLoad,
  onError,
  ...props
}: SafeImageProps) {
  const fallbackKey = Array.isArray(fallbacks) ? fallbacks.join("\0") : "";
  const chain = useMemo(() => {
    const urls = [src, ...fallbacks, fallbackSrc]
      .map((u) => (typeof u === "string" ? u.trim() : undefined))
      .filter((u): u is string => !!u)
      .filter((u) => (hidePlaceholder ? !isPlaceholderSrc(u) : true));
    return [...new Set(urls)];
    // fallbackKey captures fallbacks contents without unstable array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallbackKey, fallbackSrc, hidePlaceholder]);

  const chainKey = chain.join("|");
  const primary = chain[0] ?? "";
  const showImmediately = !!priority || (!!primary && isImageWarm(primary));

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(showImmediately);

  useEffect(() => {
    setIndex(0);
    const next = chain[0] ?? "";
    setLoaded(!!priority || (!!next && isImageWarm(next)));
  }, [chainKey, priority]);

  const imgSrc = chain[Math.min(index, chain.length - 1)];
  const atLastFallback = index >= chain.length - 1;

  if (!imgSrc) {
    return (
      <div
        className={cn("relative overflow-hidden bg-surface", wrapperClassName, fill && "h-full w-full")}
        aria-hidden
      />
    );
  }

  const useNative = isSvgOrLocal(imgSrc);
  const warm = isImageWarm(imgSrc) || loaded || !!priority;
  const imgClassName = cn(
    "object-cover",
    !priority && !warm && "transition-opacity duration-150",
    !priority && !loaded && "opacity-0",
    className,
  );

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    markImageWarm(imgSrc);
    setLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!atLastFallback) {
      setIndex((i) => i + 1);
      setLoaded(false);
      return;
    }
    setLoaded(true);
    onError?.(e);
  };

  return (
    <div className={cn("relative overflow-hidden bg-surface", wrapperClassName, fill && "h-full w-full")}>
      {!loaded && !priority && (
        <div className="absolute inset-0 bg-border-subtle/40" aria-hidden />
      )}
      {useNative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : loading ?? "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          className={cn(imgClassName, fill && "absolute inset-0 h-full w-full")}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <Image
          {...props}
          fill={fill}
          sizes={sizes}
          src={imgSrc}
          alt={alt}
          priority={priority}
          loading={priority ? undefined : loading ?? "lazy"}
          unoptimized={isUnoptimizedRemote(imgSrc)}
          placeholder={!priority && imgSrc.startsWith("http") && !isImageWarm(imgSrc) ? "blur" : undefined}
          blurDataURL={
            !priority && imgSrc.startsWith("http") && !isImageWarm(imgSrc) ? BLUR_DATA_URL : undefined
          }
          className={imgClassName}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export const SafeImage = memo(SafeImageInner);
