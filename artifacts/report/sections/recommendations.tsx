"use client";

import type { RecommendationSection } from "../types";

const TIER_STYLES = {
  high: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    border: "border-l-red-500",
  },
  medium: {
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    border: "border-l-yellow-500",
  },
  low: {
    badge:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    border: "border-l-green-500",
  },
};

export function RecommendationList({ title, groups }: RecommendationSection) {
  if (!Array.isArray(groups)) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
      <div className="space-y-6">
        {groups.map((group) => {
          const styles = TIER_STYLES[group.tier];
          return (
            <div key={group.tier}>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}
              >
                {group.tier.toUpperCase()} IMPACT
              </span>
              <div className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <div
                    className={`rounded-lg border border-border border-l-4 ${styles.border} bg-background p-4`}
                    key={item.action}
                  >
                    <p className="font-medium text-foreground">{item.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.reason}
                    </p>
                    {item.impact && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold">Impact:</span>{" "}
                        {item.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
