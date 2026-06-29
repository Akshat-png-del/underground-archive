"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import { suggestArtists } from "@/lib/search";
import { SafeImage } from "@/components/ui/SafeImage";
import type { SearchResult } from "@/types/library";

export function SearchBar({
  className,
  defaultValue = "",
}: {
  className?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [q, setQ] = useState(defaultValue || searchParams.get("q") || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => suggestArtists(q, 8), [q]);
  const showSuggestions = open && q.trim().length > 0 && suggestions.length > 0;

  useEffect(() => {
    setQ(defaultValue || searchParams.get("q") || "");
  }, [defaultValue, searchParams]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [q]);

  useEffect(() => {
    if (!showSuggestions || activeIndex < 0) return;
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, showSuggestions]);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setActiveIndex(-1);
      router.push(result.href);
    },
    [router],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (showSuggestions && activeIndex >= 0) {
      navigateTo(suggestions[activeIndex]!);
      return;
    }
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateTo(suggestions[activeIndex]!);
    }
  };

  return (
    <form onSubmit={onSubmit} className={className}>
      <label className="sr-only" htmlFor="global-search">
        Search artists, tracks, sets
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          role="combobox"
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            setOpen(value.trim().length > 0);
          }}
          onFocus={() => {
            if (q.trim().length > 0) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-activedescendant={
            showSuggestions && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
          placeholder="Search artists, tracks, sets..."
          className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          autoComplete="off"
        />

        {showSuggestions && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto border border-border bg-background shadow-sm"
          >
            {suggestions.map((result, index) => (
              <li
                key={result.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <Link
                  href={result.href}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(result);
                  }}
                  className={`interactive-row flex items-center gap-3 px-3 py-2 text-sm ${
                    index === activeIndex ? "border-l-2 border-l-accent bg-surface" : ""
                  }`}
                >
                  {result.image && (
                    <div className="relative h-8 w-8 shrink-0">
                      <SafeImage src={result.image} alt="" fill sizes="32px" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{result.title}</p>
                    <p className="truncate text-xs text-muted">{result.subtitle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
