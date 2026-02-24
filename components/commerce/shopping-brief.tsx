"use client";

import { ShoppingBagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShoppingBriefProps = {
  query: string;
  targetProduct?: string;
  budget?: string;
  retailers?: string[];
  criteria?: string[];
  className?: string;
};

export function ShoppingBrief({
  query,
  targetProduct,
  budget,
  retailers,
  criteria,
  className,
}: ShoppingBriefProps) {
  return (
    <div
      className={cn(
        "not-prose my-2 rounded-lg border border-border/50 bg-muted/30 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ShoppingBagIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm leading-relaxed text-foreground">{query}</p>

          {targetProduct && (
            <p className="font-mono text-xs text-muted-foreground">
              {targetProduct}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {budget && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                Budget: {budget}
              </span>
            )}
            {retailers?.map((retailer) => (
              <span
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                key={retailer}
              >
                {retailer}
              </span>
            ))}
            {criteria?.map((criterion) => (
              <span
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                key={criterion}
              >
                {criterion}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
