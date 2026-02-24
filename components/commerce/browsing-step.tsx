"use client";

import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BrowsingStepData } from "@/lib/ai/commerce/schemas";
import { cn } from "@/lib/utils";

type DynamicToolState =
  | "input-streaming"
  | "input-available"
  | "output-streaming"
  | "output-available"
  | "approval-requested"
  | "approval-responded"
  | "output-error"
  | "output-denied";

const isLoading = (state: DynamicToolState) =>
  state === "input-streaming" ||
  state === "input-available" ||
  state === "output-streaming";

export type BrowsingStepProps = {
  data: BrowsingStepData;
  state: DynamicToolState;
  className?: string;
};

export function BrowsingStep({ data, state, className }: BrowsingStepProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const loading = isLoading(state);

  let hostname: string | undefined;
  try {
    hostname = new URL(data.url).hostname;
  } catch {
    hostname = data.url;
  }

  return (
    <div
      className={cn(
        "not-prose my-1 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 transition-colors",
        className
      )}
    >
      {/* Favicon + site name */}
      <div className="flex shrink-0 items-center gap-2">
        {data.favicon ? (
          // biome-ignore lint/performance/noImgElement: external favicon
          <img alt="" className="size-4 rounded-sm" src={data.favicon} />
        ) : (
          <GlobeIcon className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {loading ? `Browsing ${data.siteName || hostname}...` : data.siteName}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {loading ? "Navigating and analysing page..." : data.description}
        </p>
      </div>

      {/* Products found badge */}
      {!loading && data.productsFound > 0 && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {data.productsFound} product{data.productsFound !== 1 ? "s" : ""}
        </span>
      )}

      {/* Screenshot thumbnail */}
      {loading ? (
        <div className="size-[60px] shrink-0 animate-pulse rounded-md bg-muted" />
      ) : data.screenshot ? (
        <Dialog onOpenChange={setImageOpen} open={imageOpen}>
          <DialogTrigger asChild>
            <button
              className="shrink-0 overflow-hidden rounded-md border border-border/50 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
              type="button"
            >
              {/* biome-ignore lint/performance/noImgElement: base64 screenshot */}
              <img
                alt={`Screenshot of ${data.siteName}`}
                className="size-[60px] object-cover"
                src={data.screenshot}
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogTitle className="sr-only">
              Screenshot of {data.siteName}
            </DialogTitle>
            {/* biome-ignore lint/performance/noImgElement: base64 screenshot */}
            <img
              alt={`Full screenshot of ${data.siteName}`}
              className="w-full rounded-md"
              src={data.screenshot}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
