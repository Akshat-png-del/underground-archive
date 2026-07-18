"use client";

import { memo, useEffect, useRef, useState } from "react";

/**
 * Lightweight reveal — above-the-fold content paints immediately;
 * below-fold fades in with a short transition (perf-first).
 */
export const FadeInSection = memo(function FadeInSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Already near viewport → show now (no wait for observer tick)
    if (rect.top < (typeof window !== "undefined" ? window.innerHeight + 160 : 800)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
});
