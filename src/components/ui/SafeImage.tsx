"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

const FALLBACK = "/images/artist-fallback.svg";

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTExIi8+PC9zdmc+";

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
  fallbacks?: string[];
  wrapperClassName?: string;
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

export function SafeImage({
  src,
  alt,
  className,
  wrapperClassName,
  fallbackSrc = FALLBACK,
  fallbacks = [],
  fill,
  sizes,
  onLoad,
  onError,
  ...props
}: SafeImageProps) {
  const chain = useMemo(() => {
    const urls = [src, ...fallbacks, fallbackSrc]
      .map((u) => (typeof u === "string" ? u : undefined))
      .filter((u): u is string => !!u);
    return [...new Set(urls)];
  }, [src, fallbacks, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const initialSrc = typeof src === "string" ? src : "";
  const [loaded, setLoaded] = useState(() => isSvgOrLocal(initialSrc));

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [chain.join("|")]);

  const imgSrc = chain[Math.min(index, chain.length - 1)] ?? fallbackSrc;
  const atLastFallback = index >= chain.length - 1;
  const useNative = typeof imgSrc === "string" && isSvgOrLocal(imgSrc);

  const imgClassName = cn(
    "object-cover transition-opacity duration-300",
    loaded ? "opacity-100" : "opacity-0",
    className
  );

  return (
    <div className={cn("relative overflow-hidden bg-surface", wrapperClassName, fill && "h-full w-full")}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-border-subtle" aria-hidden />
      )}
      {useNative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={alt}
          sizes={sizes}
          className={cn(imgClassName, fill && "absolute inset-0 h-full w-full")}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e as unknown as React.SyntheticEvent<HTMLImageElement, Event>);
          }}
          onError={(e) => {
            if (!atLastFallback) {
              setIndex((i) => i + 1);
              setLoaded(false);
              return;
            }
            setLoaded(true);
            onError?.(e as unknown as React.SyntheticEvent<HTMLImageElement, Event>);
          }}
        />
      ) : (
        <Image
          {...props}
          fill={fill}
          sizes={sizes}
          src={imgSrc}
          alt={alt}
          unoptimized={typeof imgSrc === "string" && (isSvgOrLocal(imgSrc) || isUnoptimizedRemote(imgSrc))}
          placeholder={typeof imgSrc === "string" && imgSrc.startsWith("http") ? "blur" : undefined}
          blurDataURL={typeof imgSrc === "string" && imgSrc.startsWith("http") ? BLUR_DATA_URL : undefined}
          className={imgClassName}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            if (!atLastFallback) {
              setIndex((i) => i + 1);
              setLoaded(false);
              return;
            }
            setLoaded(true);
            onError?.(e);
          }}
        />
      )}
    </div>
  );
}
