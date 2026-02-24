"use client";

import { TrophyIcon } from "lucide-react";
import { useState } from "react";
import type { ComparisonResult } from "@/lib/ai/commerce/schemas";
import { cn } from "@/lib/utils";

export type ComparisonTableProps = {
  data: ComparisonResult;
  className?: string;
};

export function ComparisonTable({ data, className }: ComparisonTableProps) {
  const { products, dimensions, winner } = data;
  const [sortKey, setSortKey] = useState<string | null>(null);

  const sortedDimensions = sortKey
    ? [...dimensions].sort((a, b) => {
        if (a.name === sortKey) {
          return -1;
        }
        if (b.name === sortKey) {
          return 1;
        }
        return 0;
      })
    : dimensions;

  return (
    <div className={cn("not-prose my-3 space-y-3", className)}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Dimension
              </th>
              {products.map((product, i) => (
                <th
                  className={cn(
                    "px-4 py-2.5 text-left font-medium",
                    i === winner.index
                      ? "bg-green-50/50 text-foreground dark:bg-green-950/20"
                      : "text-muted-foreground"
                  )}
                  key={product.sourceUrl}
                >
                  <div className="flex items-center gap-1.5">
                    {product.name}
                    {i === winner.index && (
                      <TrophyIcon className="size-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {product.retailer}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDimensions.map((dim) => (
              <tr
                className="border-b border-border/30 last:border-b-0"
                key={dim.name}
              >
                <td className="px-4 py-2">
                  <button
                    className="font-medium text-foreground transition-colors hover:text-muted-foreground"
                    onClick={() =>
                      setSortKey(sortKey === dim.name ? null : dim.name)
                    }
                    type="button"
                  >
                    {dim.name}
                  </button>
                </td>
                {dim.values.map((value, i) => (
                  <td
                    className={cn(
                      "px-4 py-2 text-muted-foreground",
                      i === dim.winnerId && "font-medium text-foreground",
                      i === winner.index &&
                        "bg-green-50/50 dark:bg-green-950/20"
                    )}
                    key={`${dim.name}-${products[i]?.sourceUrl}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {products.map((product, i) => (
          <div
            className={cn(
              "rounded-lg border border-border/50 p-3",
              i === winner.index &&
                "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
            )}
            key={product.sourceUrl}
          >
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">
                {product.name}
              </h4>
              {i === winner.index && (
                <TrophyIcon className="size-3.5 text-amber-500" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.retailer}
            </p>
            <dl className="mt-2 space-y-1">
              {dimensions.map((dim) => (
                <div className="flex justify-between text-xs" key={dim.name}>
                  <dt className="text-muted-foreground">{dim.name}</dt>
                  <dd
                    className={cn(
                      "text-foreground",
                      dim.winnerId === i && "font-medium"
                    )}
                  >
                    {dim.values[i]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
