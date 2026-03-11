"use client";

import type { HeaderSection } from "../types";

export function SectionHeader({ title, subtitle }: HeaderSection) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
