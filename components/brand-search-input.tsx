"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "@/components/elements/loader";
import { Input } from "@/components/ui/input";

type Suggestion = {
  name: string;
  url: string;
  description?: string;
};

export function BrandSearchInput({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (suggestion: Suggestion) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [fetching, setFetching] = useState(false);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showLoader = pending || fetching;

  const fetchSuggestions = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setFetching(true);
      try {
        const res = await fetch(`/api/project/${projectId}/brand-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Lookup failed");
        }

        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setSuggestions([]);
        setOpen(false);
      } finally {
        setFetching(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      setPending(false);
      return;
    }

    setPending(true);
    const timer = setTimeout(() => {
      setPending(false);
      fetchSuggestions(query.trim());
    }, 500);
    return () => {
      clearTimeout(timer);
      setPending(false);
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(suggestions[activeIndex]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a brand..."
          ref={inputRef}
          value={query}
        />
        {showLoader && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader size={16} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
          >
            {suggestions.map((s, i) => {
              const favicon = getFaviconUrl(s.url);
              return (
                <button
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    i === activeIndex ? "bg-accent" : ""
                  }`}
                  key={`${s.name}-${s.url}`}
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {favicon ? (
                    // biome-ignore lint/performance/noImgElement: external favicon — Next Image requires remotePatterns config
                    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError hides broken favicon
                    <img
                      alt=""
                      className="size-8 shrink-0 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      src={favicon}
                    />
                  ) : (
                    <div className="size-8 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.url}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
