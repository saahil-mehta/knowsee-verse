"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BrandProfile } from "@/lib/db/schema";
import { toast } from "./toast";

const COUNTRIES = [
  "AU",
  "BR",
  "CA",
  "CN",
  "DE",
  "ES",
  "FR",
  "GB",
  "IN",
  "IT",
  "JP",
  "KR",
  "MX",
  "NL",
  "RU",
  "SA",
  "SE",
  "SG",
  "US",
  "ZA",
] as const;

export function BrandProfileForm({
  projectId,
  initialData,
  onCancel,
}: {
  projectId: string;
  initialData?: BrandProfile;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [brandName, setBrandName] = useState(initialData?.brandName ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? "");
  const [country, setCountry] = useState(initialData?.country ?? "");
  const [market, setMarket] = useState(initialData?.market ?? "");
  const [categories, setCategories] = useState<string[]>(
    (initialData?.categories as string[]) ?? []
  );
  const [competitors, setCompetitors] = useState<string[]>(
    (initialData?.competitors as string[]) ?? []
  );
  const [retailers, setRetailers] = useState<string[]>(
    (initialData?.retailers as string[]) ?? []
  );
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    brandName.trim() &&
    websiteUrl.trim() &&
    country &&
    categories.length > 0 &&
    competitors.length > 0 &&
    retailers.length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`/api/project/${projectId}/brand-profile`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          websiteUrl,
          country,
          market: market || undefined,
          categories,
          competitors,
          retailers,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }
      router.refresh();
      onCancel?.();
    } catch (_err) {
      toast({ type: "error", description: "Failed to save brand profile." });
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    {
      label: "Brand name",
      content: (
        <Input
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="e.g. Samsung"
          value={brandName}
        />
      ),
    },
    {
      label: "Website URL",
      content: (
        <Input
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          type="url"
          value={websiteUrl}
        />
      ),
    },
    {
      label: "Country",
      content: (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setCountry(e.target.value)}
          value={country}
        >
          <option value="">Select country...</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: "Market",
      content: (
        <Input
          onChange={(e) => setMarket(e.target.value)}
          placeholder="e.g. GB, US, IN"
          value={market}
        />
      ),
    },
    {
      label: "Categories",
      content: (
        <TagInput
          onChange={setCategories}
          placeholder="Type a category and press Enter"
          value={categories}
        />
      ),
    },
    {
      label: "Competitors",
      content: (
        <TagInput
          onChange={setCompetitors}
          placeholder="Type a competitor and press Enter"
          value={competitors}
        />
      ),
    },
    {
      label: "Retailers",
      content: (
        <TagInput
          onChange={setRetailers}
          placeholder="Type a retailer and press Enter"
          value={retailers}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8">
      <div>
        <h2 className="text-lg font-semibold">
          {isEdit ? "Edit Brand Profile" : "Set Up Brand Profile"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? "Update your brand details below."
            : "Fill in all fields to unlock brand intelligence tools."}
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, i) => (
          <div
            className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-1.5"
            key={field.label}
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <span className="text-sm font-medium">{field.label}</span>
            {field.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? "Saving..." : isEdit ? "Update" : "Create Profile"}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
