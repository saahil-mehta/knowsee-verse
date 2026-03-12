# Brand Profile Setup Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the manual 6-field brand profile form with an autocomplete-driven setup that requires only a brand search query, then auto-populates all fields via web search + AI extraction.

**Architecture:** Single search input → Haiku `web_search` PTC for brand lookup autocomplete → on selection, parallel server scrape (logo, country) + Haiku extraction (categories, competitors, retailers) → review card with edit/confirm. All via `gateway("anthropic/claude-haiku-4-5")` + existing Anthropic PTC tools.

**Tech Stack:** Vercel AI SDK `generateObject`/`generateText`, Anthropic `web_search`/`web_fetch` PTC, `cmdk` for autocomplete, `motion` for animations, existing UI primitives (Input, Button, Badge, Skeleton, toast).

---

### Task 1: Brand Lookup API Route

**Files:**
- Create: `app/(chat)/api/project/[id]/brand-lookup/route.ts`

**Step 1: Create the route**

```ts
// app/(chat)/api/project/[id]/brand-lookup/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { gateway } from "@ai-sdk/gateway";
import { getSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries";

const lookupRequestSchema = z.object({
  query: z.string().min(1).max(256),
});

const suggestionSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const proj = await getProjectById({ id });
  if (!proj || proj.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const json = await request.json();
  const { query } = lookupRequestSchema.parse(json);

  const { text, sources } = await generateText({
    model: gateway("anthropic/claude-haiku-4-5"),
    tools: {
      web_search: anthropic.tools.webSearch_20250305({
        maxUses: 2,
      }),
    },
    maxSteps: 3,
    prompt: `Find the official website for: "${query}".

Search the web to find this brand's official website. If the query includes a country or region (e.g. "Nike UK", "Samsung Germany"), find the regional/localised URL.

Return ONLY a JSON array of 1-5 suggestions, each with:
- "name": the brand's full name
- "url": the official website URL (regional if specified)
- "description": one-line description of what the brand does

Example: [{"name": "Nike UK", "url": "https://www.nike.com/gb/", "description": "Sportswear and athletic footwear"}]

Return ONLY the JSON array, no other text.`,
  });

  // Parse suggestions from the text response
  try {
    const parsed = JSON.parse(text.trim().replace(/```json?\n?|\n?```/g, ""));
    const suggestions = z.array(suggestionSchema).parse(parsed);
    return Response.json({ suggestions, sources: sources ?? [] });
  } catch {
    return Response.json({ suggestions: [], sources: [] });
  }
}
```

**Step 2: Commit**
```bash
git add app/(chat)/api/project/[id]/brand-lookup/route.ts
git commit -m "feat(api): add brand lookup route with Haiku web search"
```

---

### Task 2: Brand Enrichment API Route

**Files:**
- Create: `app/(chat)/api/project/[id]/brand-enrich/route.ts`

**Step 1: Create the enrichment route**

This route takes a brand URL + name, does a server-side fetch for HTML metadata, then uses Haiku to extract categories/competitors/retailers from the page content.

```ts
// app/(chat)/api/project/[id]/brand-enrich/route.ts
import { generateObject } from "ai";
import { z } from "zod";
import { gateway } from "@ai-sdk/gateway";
import { getSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries";

const enrichRequestSchema = z.object({
  brandName: z.string().min(1).max(256),
  websiteUrl: z.string().url().max(512),
});

const enrichResultSchema = z.object({
  country: z.string().describe("ISO 3166-1 alpha-2 country code, e.g. GB, US, DE"),
  categories: z.array(z.string()).describe("Product/service categories the brand operates in, 2-8 items"),
  competitors: z.array(z.string()).describe("Key competitor brand names, 2-8 items"),
  retailers: z.array(z.string()).describe("Major retailers/channels that sell this brand, 2-8 items. If D2C only, list their own channels."),
});

async function scrapeMetadata(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Knowsee/1.0 (brand-enrichment)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract favicon/logo
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
    const favicon = html.match(/<link[^>]+rel="(?:icon|shortcut icon)"[^>]+href="([^"]+)"/i)?.[1];
    const logoUrl = ogImage || (favicon ? new URL(favicon, url).href : null);

    // Extract country from hreflang or og:locale
    const ogLocale = html.match(/<meta[^>]+property="og:locale"[^>]+content="([^"]+)"/i)?.[1];
    const hreflang = html.match(/<link[^>]+hreflang="([a-z]{2}-[A-Z]{2})"[^>]+rel="alternate"/i)?.[1];
    const countryHint = hreflang?.split("-")[1] || ogLocale?.split("_")[1] || null;

    // Extract page text for AI context (truncated)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    return { logoUrl, countryHint, textContent };
  } catch {
    return { logoUrl: null, countryHint: null, textContent: "" };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const proj = await getProjectById({ id });
  if (!proj || proj.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const json = await request.json();
  const { brandName, websiteUrl } = enrichRequestSchema.parse(json);

  // Run scrape + AI extraction in parallel
  const scrapePromise = scrapeMetadata(websiteUrl);

  const aiPromise = generateObject({
    model: gateway("anthropic/claude-haiku-4-5"),
    schema: enrichResultSchema,
    prompt: `Analyse the brand "${brandName}" (website: ${websiteUrl}).

Based on your knowledge of this brand, provide:
1. The primary country of operation (ISO 3166-1 alpha-2 code)
2. Their main product/service categories (2-8)
3. Their key competitors (2-8 brand names)
4. Major retailers/channels that stock their products (2-8). If they are primarily D2C, list their own sales channels.

Be specific and accurate. Use well-known category names and real competitor/retailer names.`,
  });

  const [scraped, aiResult] = await Promise.all([scrapePromise, aiPromise]);

  return Response.json({
    logoUrl: scraped.logoUrl,
    country: scraped.countryHint || aiResult.object.country,
    categories: aiResult.object.categories,
    competitors: aiResult.object.competitors,
    retailers: aiResult.object.retailers,
  });
}
```

**Step 2: Commit**
```bash
git add app/(chat)/api/project/[id]/brand-enrich/route.ts
git commit -m "feat(api): add brand enrichment route with scrape + Haiku extraction"
```

---

### Task 3: Brand Search Input Component

**Files:**
- Create: `components/brand-search-input.tsx`

**Step 1: Create the autocomplete search component**

Uses a custom input with a floating results dropdown (not cmdk — simpler, more control over the async loading states and animations). Debounced 500ms, shows suggestions with favicon + name + URL.

```tsx
// components/brand-search-input.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/elements/loader";

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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(`/api/project/${projectId}/brand-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  // Debounce
  useEffect(() => {
    const timeout = setTimeout(() => search(query), 500);
    return () => clearTimeout(timeout);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      onSelect(suggestions[selectedIndex]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          autoFocus
          className="h-12 text-base"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a brand, e.g. Nike UK..."
          value={query}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader size={16} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="py-1">
              {suggestions.map((s, i) => (
                <motion.button
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  initial={{ opacity: 0, x: -8 }}
                  key={s.url}
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                  transition={{ delay: i * 0.03 }}
                  type="button"
                >
                  {getFaviconUrl(s.url) && (
                    <img
                      alt=""
                      className="size-5 rounded-sm"
                      src={getFaviconUrl(s.url)!}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.url}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add components/brand-search-input.tsx
git commit -m "feat(ui): add brand search autocomplete input with Haiku web search"
```

---

### Task 4: Brand Profile Setup Component

**Files:**
- Create: `components/brand-profile-setup.tsx`
- This replaces usage of `brand-profile-form.tsx` in the project page

**Step 1: Create the three-state setup component**

Three states: `search` → `populating` → `review`.

The review card follows the Vercel deployment success card aesthetic — clean header with logo/name, list of details with icons, edit button, primary CTA.

```tsx
// components/brand-profile-setup.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandSearchInput } from "@/components/brand-search-input";
import { TagInput } from "@/components/tag-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/toast";

type Suggestion = { name: string; url: string; description?: string };

type EnrichedData = {
  logoUrl: string | null;
  country: string;
  categories: string[];
  competitors: string[];
  retailers: string[];
};

type SetupState = "search" | "populating" | "review" | "editing" | "drilldown";

export function BrandProfileSetup({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SetupState>("search");
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [enriched, setEnriched] = useState<EnrichedData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Editable fields (populated from enrichment, editable in review/editing)
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [country, setCountry] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [retailers, setRetailers] = useState<string[]>([]);

  // Drill-down state (fallback when autocomplete has no results)
  const [drilldownUrl, setDrilldownUrl] = useState("");

  const handleSelect = async (suggestion: Suggestion) => {
    setSelected(suggestion);
    setBrandName(suggestion.name);
    setWebsiteUrl(suggestion.url);
    setState("populating");

    try {
      const res = await fetch(`/api/project/${projectId}/brand-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: suggestion.name,
          websiteUrl: suggestion.url,
        }),
      });

      if (!res.ok) throw new Error();

      const data: EnrichedData = await res.json();
      setEnriched(data);
      setCountry(data.country);
      setCategories(data.categories);
      setCompetitors(data.competitors);
      setRetailers(data.retailers);
      setState("review");
      toast({ type: "success", description: `Analysed ${suggestion.name}` });
    } catch {
      toast({ type: "error", description: "Failed to analyse brand. Try again." });
      setState("search");
    }
  };

  const handleDrilldown = async () => {
    if (!drilldownUrl.trim() || !brandName.trim()) return;

    const url = drilldownUrl.startsWith("http")
      ? drilldownUrl
      : `https://${drilldownUrl}`;

    setSelected({ name: brandName, url });
    setWebsiteUrl(url);
    setState("populating");

    try {
      const res = await fetch(`/api/project/${projectId}/brand-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, websiteUrl: url }),
      });

      if (!res.ok) throw new Error();

      const data: EnrichedData = await res.json();
      setEnriched(data);
      setCountry(data.country);
      setCategories(data.categories);
      setCompetitors(data.competitors);
      setRetailers(data.retailers);
      setState("review");
      toast({ type: "success", description: `Analysed ${brandName}` });
    } catch {
      toast({ type: "error", description: "Failed to analyse brand. Try again." });
      setState("drilldown");
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);

    try {
      const res = await fetch(`/api/project/${projectId}/brand-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          websiteUrl,
          country,
          categories,
          competitors,
          retailers,
        }),
      });

      if (!res.ok) throw new Error();
      toast({ type: "success", description: "Brand profile created" });
      router.refresh();
    } catch {
      toast({ type: "error", description: "Failed to create profile." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelected(null);
    setEnriched(null);
    setBrandName("");
    setWebsiteUrl("");
    setCountry("");
    setCategories([]);
    setCompetitors([]);
    setRetailers([]);
    setState("search");
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* ── Search state ── */}
          {state === "search" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="search"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg font-semibold">Find your brand</h2>
                <p className="text-sm text-muted-foreground">
                  Search by name and region to get started.
                </p>
              </div>
              <BrandSearchInput
                projectId={projectId}
                onSelect={handleSelect}
              />
              <button
                className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setState("drilldown")}
                type="button"
              >
                Can&apos;t find your brand? Enter details manually
              </button>
            </motion.div>
          )}

          {/* ── Drill-down state (fallback) ── */}
          {state === "drilldown" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="drilldown"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg font-semibold">Tell us about the brand</h2>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll gather the rest automatically.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Brand name</span>
                  <Input
                    autoFocus
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Samsung"
                    value={brandName}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Website URL</span>
                  <Input
                    onChange={(e) => setDrilldownUrl(e.target.value)}
                    placeholder="e.g. samsung.com/gb"
                    value={drilldownUrl}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!brandName.trim() || !drilldownUrl.trim()}
                  onClick={handleDrilldown}
                >
                  Analyse brand
                </Button>
                <Button onClick={handleReset} variant="ghost">
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Populating state ── */}
          {state === "populating" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="populating"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg font-semibold">
                  Analysing {selected?.name}...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Gathering brand intelligence from the web.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border p-5">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Field skeletons */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    className="flex items-center gap-3"
                    key={i}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <Skeleton className="size-5 rounded" />
                    <Skeleton
                      className="h-4"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Review state ── */}
          {state === "review" && enriched && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="review"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg font-semibold">Confirm brand profile</h2>
                <p className="text-sm text-muted-foreground">
                  Review the details below and adjust if needed.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border">
                {/* Brand header */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    {(enriched.logoUrl || getFaviconUrl(websiteUrl)) && (
                      <img
                        alt={brandName}
                        className="size-10 rounded-lg bg-muted object-contain"
                        src={enriched.logoUrl || getFaviconUrl(websiteUrl)!}
                      />
                    )}
                    <div>
                      <div className="font-semibold">{brandName}</div>
                      <a
                        className="text-xs text-muted-foreground hover:underline"
                        href={websiteUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {websiteUrl}
                      </a>
                    </div>
                  </div>
                  <Button
                    onClick={() => setState("editing")}
                    size="sm"
                    variant="ghost"
                  >
                    Edit
                  </Button>
                </div>

                {/* Details list */}
                <div className="divide-y">
                  <DetailRow label="Country" value={country} />
                  <DetailRow label="Categories">
                    <div className="flex flex-wrap gap-1">
                      {categories.map((c) => (
                        <Badge key={c} variant="secondary">{c}</Badge>
                      ))}
                    </div>
                  </DetailRow>
                  <DetailRow label="Competitors">
                    <div className="flex flex-wrap gap-1">
                      {competitors.map((c) => (
                        <Badge key={c} variant="outline">{c}</Badge>
                      ))}
                    </div>
                  </DetailRow>
                  <DetailRow label="Retailers">
                    <div className="flex flex-wrap gap-1">
                      {retailers.map((c) => (
                        <Badge key={c} variant="outline">{c}</Badge>
                      ))}
                    </div>
                  </DetailRow>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleConfirm}
                >
                  {submitting ? "Creating..." : "Create Brand Profile"}
                </Button>
                <Button onClick={handleReset} variant="ghost">
                  Start over
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Editing state ── */}
          {state === "editing" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="editing"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg font-semibold">Edit brand details</h2>
                <p className="text-sm text-muted-foreground">
                  Adjust anything that doesn&apos;t look right.
                </p>
              </div>

              <div className="space-y-3">
                <FieldGroup label="Brand name">
                  <Input
                    onChange={(e) => setBrandName(e.target.value)}
                    value={brandName}
                  />
                </FieldGroup>
                <FieldGroup label="Website URL">
                  <Input
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    value={websiteUrl}
                  />
                </FieldGroup>
                <FieldGroup label="Country">
                  <Input
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. GB"
                    value={country}
                  />
                </FieldGroup>
                <FieldGroup label="Categories">
                  <TagInput
                    onChange={setCategories}
                    placeholder="Type and press Enter"
                    value={categories}
                  />
                </FieldGroup>
                <FieldGroup label="Competitors">
                  <TagInput
                    onChange={setCompetitors}
                    placeholder="Type and press Enter"
                    value={competitors}
                  />
                </FieldGroup>
                <FieldGroup label="Retailers">
                  <TagInput
                    onChange={setRetailers}
                    placeholder="Type and press Enter"
                    value={retailers}
                  />
                </FieldGroup>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setState("review")}>
                  Done editing
                </Button>
                <Button onClick={handleReset} variant="ghost">
                  Start over
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-5 py-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="text-right text-sm">
        {value || children}
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add components/brand-profile-setup.tsx
git commit -m "feat(ui): add brand profile setup with autocomplete, enrichment, and review"
```

---

### Task 5: Update Project Page + Relax Schema Validation

**Files:**
- Modify: `app/(chat)/project/[id]/page.tsx` — swap `BrandProfileForm` for `BrandProfileSetup`
- Modify: `app/(chat)/api/project/schema.ts` — relax array minimums (allow empty arrays from enrichment edge cases)

**Step 1: Update the project page**

Replace `BrandProfileForm` import/usage with `BrandProfileSetup`.

In `app/(chat)/project/[id]/page.tsx`, change:
```tsx
import { BrandProfileForm } from "@/components/brand-profile-form";
```
to:
```tsx
import { BrandProfileSetup } from "@/components/brand-profile-setup";
```

And in the `!profile` branch, change:
```tsx
<BrandProfileForm projectId={id} />
```
to:
```tsx
<BrandProfileSetup projectId={id} />
```

**Step 2: Update schema validation**

In `app/(chat)/api/project/schema.ts`, relax arrays to allow empty (enrichment might return zero retailers for D2C brands):

```ts
export const brandProfileSchema = z.object({
  brandName: z.string().min(1).max(256),
  websiteUrl: z.string().url().max(512),
  country: z.string().min(1).max(64),
  categories: z.array(z.string().max(100)).max(20),
  competitors: z.array(z.string().max(100)).max(20),
  retailers: z.array(z.string().max(100)).max(20),
});
```

**Step 3: Commit**
```bash
git add app/(chat)/project/[id]/page.tsx app/(chat)/api/project/schema.ts
git commit -m "feat(ui): wire brand profile setup into project page and relax schema"
```

---

### Task 6: Verify and Polish

**Step 1: Run the dev server and test the full flow**
```bash
make dev
```

Test:
1. Navigate to a project without a brand profile
2. Type a brand name (e.g. "Nike UK") in the search
3. Verify suggestions appear with favicons and regional URLs
4. Select a suggestion — verify skeleton loading state appears
5. Verify review card populates with logo, country, categories, competitors, retailers
6. Click Edit — verify editing state with tag inputs works
7. Click "Create Brand Profile" — verify toast and redirect to project home
8. Test drill-down flow: click "Can't find your brand?", enter name + URL manually

**Step 2: Test edge cases**
- Empty search (nothing should happen under 2 chars)
- Rapid typing (abort controller should cancel stale requests)
- Network error during enrichment (should show error toast and reset to search)
- Unknown/small brand (should gracefully handle AI returning partial data)

**Step 3: Final commit**
```bash
git add -A
git commit -m "fix(ui): polish brand profile setup flow"
```
