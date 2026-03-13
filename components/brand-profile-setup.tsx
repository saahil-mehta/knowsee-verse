"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandSearchInput } from "@/components/brand-search-input";
import { Loader } from "@/components/elements/loader";
import { TagInput } from "@/components/tag-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "./toast";

type Suggestion = {
  name: string;
  url: string;
  description?: string;
};

type EnrichmentData = {
  logoUrl: string;
  country: string;
  market: string;
  categories: string[];
  competitors: string[];
  retailers: string[];
};

type SetupState = "search" | "drilldown" | "populating" | "review" | "editing";

export function BrandProfileSetup({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SetupState>("search");

  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [country, setCountry] = useState("");
  const [market, setMarket] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [retailers, setRetailers] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const resetAll = () => {
    setBrandName("");
    setWebsiteUrl("");
    setLogoUrl("");
    setCountry("");
    setMarket("");
    setCategories([]);
    setCompetitors([]);
    setRetailers([]);
    setState("search");
  };

  const enrichBrand = async (name: string, url: string) => {
    setBrandName(name);
    setWebsiteUrl(url);
    setState("populating");

    try {
      const res = await fetch(`/api/project/${projectId}/brand-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: name, websiteUrl: url }),
      });

      if (!res.ok) {
        throw new Error("Enrichment failed");
      }

      const data: EnrichmentData = await res.json();
      setLogoUrl(data.logoUrl);
      setCountry(data.country);
      setMarket(data.market);
      setCategories(data.categories);
      setCompetitors(data.competitors);
      setRetailers(data.retailers);
      setState("review");
      toast({
        type: "success",
        description: `Brand credentials verified for ${name}`,
      });
    } catch (_err) {
      toast({ type: "error", description: "Failed to enrich brand data." });
      resetAll();
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    enrichBrand(suggestion.name, suggestion.url);
  };

  const handleDrilldownSubmit = async () => {
    if (!brandName.trim() || !websiteUrl.trim()) {
      return;
    }
    setDrilldownLoading(true);
    await enrichBrand(brandName.trim(), websiteUrl.trim());
    setDrilldownLoading(false);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/project/${projectId}/brand-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          websiteUrl,
          logoUrl: logoUrl || undefined,
          country,
          market: market || undefined,
          categories,
          competitors,
          retailers,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create");
      }
      router.refresh();
    } catch (_err) {
      toast({ type: "error", description: "Failed to create brand profile." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {state === "search" && (
            <MotionWrapper key="search">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-lg font-semibold">Find your brand</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search by name and region to get started.
                  </p>
                </div>
                <BrandSearchInput
                  onSelect={handleSelect}
                  projectId={projectId}
                />
                <button
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setState("drilldown")}
                  type="button"
                >
                  Can't find your brand? Tell us more
                </button>
              </div>
            </MotionWrapper>
          )}

          {state === "drilldown" && (
            <MotionWrapper key="drilldown">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold">
                    Tell us about the brand
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Knowsee intelligently gathers the rest.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Brand name</span>
                    <Input
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Samsung"
                      value={brandName}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Website URL</span>
                    <Input
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                      value={websiteUrl}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      !brandName.trim() ||
                      !websiteUrl.trim() ||
                      drilldownLoading
                    }
                    onClick={handleDrilldownSubmit}
                  >
                    {drilldownLoading
                      ? "Verifying..."
                      : "Verify brand credentials"}
                  </Button>
                  <Button onClick={() => setState("search")} variant="ghost">
                    Back
                  </Button>
                </div>
              </div>
            </MotionWrapper>
          )}

          {state === "populating" && (
            <MotionWrapper key="populating">
              <div className="space-y-6">
                <div className="text-center">
                  <Shimmer
                    as="h2"
                    className="text-lg font-semibold"
                    duration={2}
                    spread={2}
                  >
                    {`Verifying ${brandName}...`}
                  </Shimmer>
                  <span className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader size={14} />
                    Knowsee is gathering real-time brand intelligence.
                  </span>
                </div>
                <div className="rounded-lg border p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-4 space-y-3">
                    {[
                      "country",
                      "market",
                      "categories",
                      "competitors",
                      "retailers",
                    ].map((field) => (
                      <div className="flex items-center gap-3" key={field}>
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MotionWrapper>
          )}

          {state === "review" && (
            <MotionWrapper key="review">
              <div className="space-y-6">
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {logoUrl && (
                        // biome-ignore lint/performance/noImgElement: external favicon — Next Image requires remotePatterns config
                        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError hides broken favicon
                        <img
                          alt=""
                          className="size-10 rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          src={logoUrl}
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

                  <div className="border-t px-4 py-3 space-y-3">
                    <DetailRow
                      label="Country"
                      value={country || "Not detected"}
                    />
                    <DetailRow
                      label="Market"
                      value={market || "Not detected"}
                    />
                    <BadgeRow
                      label="Categories"
                      values={categories}
                      variant="secondary"
                    />
                    <BadgeRow
                      label="Competitors"
                      values={competitors}
                      variant="outline"
                    />
                    <BadgeRow
                      label="Retailers"
                      values={retailers}
                      variant="outline"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button disabled={submitting} onClick={handleCreate}>
                    {submitting ? "Creating..." : "Create Brand Profile"}
                  </Button>
                  <Button onClick={resetAll} variant="ghost">
                    Start over
                  </Button>
                </div>
              </div>
            </MotionWrapper>
          )}

          {state === "editing" && (
            <MotionWrapper key="editing">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Edit brand details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adjust any fields before creating the profile.
                  </p>
                </div>

                <div className="space-y-4">
                  <FieldRow label="Brand name">
                    <Input
                      onChange={(e) => setBrandName(e.target.value)}
                      value={brandName}
                    />
                  </FieldRow>
                  <FieldRow label="Website URL">
                    <Input
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      type="url"
                      value={websiteUrl}
                    />
                  </FieldRow>
                  <FieldRow label="Country">
                    <Input
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. US, GB, IN"
                      value={country}
                    />
                  </FieldRow>
                  <FieldRow label="Market">
                    <Input
                      onChange={(e) => setMarket(e.target.value)}
                      placeholder="e.g. GB, US, IN"
                      value={market}
                    />
                  </FieldRow>
                  <FieldRow label="Categories">
                    <TagInput
                      onChange={setCategories}
                      placeholder="Type a category and press Enter"
                      value={categories}
                    />
                  </FieldRow>
                  <FieldRow label="Competitors">
                    <TagInput
                      onChange={setCompetitors}
                      placeholder="Type a competitor and press Enter"
                      value={competitors}
                    />
                  </FieldRow>
                  <FieldRow label="Retailers">
                    <TagInput
                      onChange={setRetailers}
                      placeholder="Type a retailer and press Enter"
                      value={retailers}
                    />
                  </FieldRow>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setState("review")}>
                    Done editing
                  </Button>
                  <Button onClick={resetAll} variant="ghost">
                    Start over
                  </Button>
                </div>
              </div>
            </MotionWrapper>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MotionWrapper({
  children,
  ...props
}: { children: React.ReactNode } & React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function BadgeRow({
  label,
  values,
  variant,
}: {
  label: string;
  values: string[];
  variant: "secondary" | "outline";
}) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant={variant}>
              {v}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">None detected</span>
      )}
    </div>
  );
}

function FieldRow({
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
