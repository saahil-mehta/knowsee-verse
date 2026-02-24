"use client";

import { ExternalLinkIcon, PackageIcon, StarIcon } from "lucide-react";
import type { ProductData } from "@/lib/ai/commerce/schemas";
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

const availabilityConfig = {
  "in-stock": { dot: "bg-green-500", label: "In stock" },
  "low-stock": { dot: "bg-amber-500", label: "Low stock" },
  "out-of-stock": { dot: "bg-red-500", label: "Out of stock" },
  unknown: { dot: "bg-muted-foreground", label: "Unknown" },
} as const;

export type ProductCardProps = {
  data: ProductData & { screenshot?: string };
  state: DynamicToolState;
  className?: string;
};

const starKeys = ["s1", "s2", "s3", "s4", "s5"] as const;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {starKeys.map((key, i) => (
        <StarIcon
          className={cn(
            "size-3",
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          )}
          key={key}
        />
      ))}
    </div>
  );
}

function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose my-2 rounded-lg border border-border/50 bg-muted/20 p-4",
        className
      )}
    >
      <div className="flex gap-4">
        <div className="size-20 shrink-0 animate-pulse rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ data, state, className }: ProductCardProps) {
  if (isLoading(state)) {
    return <ProductCardSkeleton className={className} />;
  }

  const availability = availabilityConfig[data.availability];
  let hostname: string | undefined;
  try {
    hostname = new URL(data.sourceUrl).hostname;
  } catch {
    hostname = data.retailer;
  }

  return (
    <div
      className={cn(
        "not-prose my-2 rounded-lg border border-border/50 bg-muted/20 p-4 transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex gap-4">
        {/* Product image */}
        <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {data.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: external product image
            <img
              alt={data.name}
              className="size-full object-cover"
              src={data.imageUrl}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <PackageIcon className="size-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h4 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
            {data.name}
          </h4>

          {/* Price */}
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: data.currency || "GBP",
            }).format(data.price)}
          </p>

          {/* Rating + reviews */}
          <div className="flex items-center gap-2">
            {data.rating != null && (
              <>
                <StarRating rating={data.rating} />
                <span className="text-xs text-muted-foreground">
                  {data.rating.toFixed(1)}
                </span>
              </>
            )}
            {data.reviewCount != null && (
              <span className="text-xs text-muted-foreground">
                ({data.reviewCount.toLocaleString()} reviews)
              </span>
            )}
          </div>

          {/* Availability + retailer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={cn("size-1.5 rounded-full", availability.dot)} />
              <span className="text-xs text-muted-foreground">
                {availability.label}
              </span>
            </div>

            <a
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              href={data.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {hostname && (
                // biome-ignore lint/performance/noImgElement: external favicon
                <img
                  alt=""
                  className="size-3 rounded-sm"
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                />
              )}
              View on {data.retailer}
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      {data.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.features.slice(0, 4).map((feature) => (
            <span
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              key={feature}
            >
              {feature}
            </span>
          ))}
          {data.features.length > 4 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              +{data.features.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
