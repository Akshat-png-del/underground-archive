"use client";

import { useRef } from "react";
import Link from "next/link";

interface HomeCarouselProps {
  children: React.ReactNode;
  className?: string;
}

export function HomeCarousel({ children, className = "" }: HomeCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className={`relative min-w-0 max-w-full ${className}`}>
      <div
        ref={ref}
        className="flex max-w-full gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

export function CarouselItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-[72%] shrink-0 snap-start sm:min-w-[45%] lg:min-w-[32%] ${className}`}>
      {children}
    </div>
  );
}

interface HomeSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  variant?: "default" | "surface" | "accent";
}

export function HomeSection({
  title,
  subtitle,
  badge,
  href,
  linkLabel = "View all",
  children,
  variant = "default",
}: HomeSectionProps) {
  const bg =
    variant === "surface"
      ? "border-t border-border bg-surface"
      : variant === "accent"
        ? "border-t border-accent/20 bg-accent-glow"
        : "border-t border-border";

  return (
    <section className={`px-4 py-16 sm:py-20 ${bg}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {badge && (
              <span className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                <span className="live-pulse h-1.5 w-1.5 rounded-full bg-accent" />
                {badge}
              </span>
            )}
            <h2 className="font-serif text-3xl text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">{title}</h2>
            {subtitle && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-light">{subtitle}</p>}
          </div>
          {href && (
            <Link href={href} className="text-sm text-accent hover:underline">
              {linkLabel}
            </Link>
          )}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
