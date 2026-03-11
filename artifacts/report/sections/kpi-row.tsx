"use client";

import type { KPIRowSection } from "../types";

function TrendArrow({ trend }: { trend?: "up" | "down" | "neutral" }) {
  if (!trend || trend === "neutral") {
    return null;
  }
  return (
    <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
      {trend === "up" ? "\u2191" : "\u2193"}
    </span>
  );
}

export function KPIRow({ items }: KPIRowSection) {
  if (!Array.isArray(items)) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div
          className="rounded-lg border border-border bg-card p-4"
          key={item.label}
        >
          <p className="text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {item.value}
          </p>
          {item.change && (
            <p className="mt-1 text-xs text-muted-foreground">
              <TrendArrow trend={item.trend} /> {item.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
