import type { LucideIcon } from "lucide-react";
import { formatVolume, formatVolumeFull } from "./format";
import type { Column, Row } from "./types";

// No "use client" directive: MetricCard has no client-only behaviour (no
// state, no effects, no DOM access), and the LucideIcon prop is a React
// component function which cannot cross a server-to-client boundary. Leaving
// this dual-mode lets server-rendered tiles pass icons directly, while the
// chart-card path imports it from inside a client tree and the framework
// promotes it to a client island automatically.

// MetricCard primitive: one number, prominently. Used by the ChartByType
// dispatcher when the heuristic picks "metric", and by any headline metric
// tile via a thin wrapper that supplies icon and accent.
//
// The query-driven caller uses `rows[0][0]` as the value and `title` as the
// label, with no icon, no accent, no comparison. Headline tiles supply all
// four optional props for the polished look.
export function MetricCardFromQuery({
  columns,
  rows,
  title,
  emptyHint = "No value to show.",
}: {
  columns: Column[];
  rows: Row[];
  title?: string;
  emptyHint?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[13px] text-foreground/45">
        {emptyHint}
      </div>
    );
  }
  const raw = rows[0][0];
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return <MetricCard label={title ?? columns[0]?.name ?? ""} value={value} />;
}

export function MetricCard({
  label,
  value,
  hint,
  unit,
  icon: Icon,
  accent,
  comparison,
  formatter,
}: {
  label: string;
  value: number | string;
  hint?: string;
  // Right-aligned unit chip on the bottom row (e.g. "visits"). Renders in the
  // accent colour via the same uppercase mono treatment as the label.
  unit?: string;
  icon?: LucideIcon;
  // CSS colour token, hex, or "var(--…)". Used to tint the icon chip and the
  // hover-glow. Default is the first chart-series colour so a headline metric
  // sits in the same palette as the charts beside it.
  accent?: string;
  // Secondary metric shown beside the main number (e.g. "73%" share, "+12%
  // YoY"). Tone narrows colour treatment; omit tone to inherit the tile
  // accent.
  comparison?: {
    label: string;
    tone?: "accent" | "neutral" | "positive" | "negative";
  };
  // Override the default compact formatter. Pass identity for already-
  // formatted strings, formatCount for integer counts, etc.
  formatter?: (value: number) => string;
}) {
  const accentColor = accent ?? "var(--chart-1)";
  const valueText =
    typeof value === "string" ? value : (formatter ?? formatVolume)(value);
  const valueTitle =
    typeof value === "number" ? formatVolumeFull(value) : undefined;
  const tone = comparison?.tone ?? "accent";
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "neutral"
          ? "text-foreground/60"
          : "";
  const toneStyle = tone === "accent" ? { color: accentColor } : undefined;

  return (
    <article
      className="group/tile relative overflow-hidden rounded-2xl border border-border/60 bg-background p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.25)]"
      style={{ ["--tile-accent" as string]: accentColor }}
    >
      <div
        aria-hidden
        className="-top-20 -right-16 pointer-events-none absolute size-44 rounded-full opacity-0 blur-3xl transition-opacity group-hover/tile:opacity-100"
        style={{
          backgroundColor: `color-mix(in srgb, ${accentColor} 11%, transparent)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <div className="font-mono text-[10px] text-foreground/40 uppercase tracking-[0.18em]">
          {label}
        </div>
        {Icon && (
          <span
            className="inline-flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
              color: accentColor,
            }}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <span
          className="font-serif font-medium text-[40px] text-foreground/90 leading-none tracking-tight"
          title={valueTitle}
        >
          {valueText}
        </span>
        {comparison && (
          <span
            className={`font-mono text-[11px] tabular-nums ${toneClass}`}
            style={toneStyle}
          >
            {comparison.label}
          </span>
        )}
      </div>
      {(hint || unit) && (
        <div className="mt-3 flex items-baseline justify-between text-[12px] text-foreground/50">
          {hint && <span>{hint}</span>}
          {unit && (
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: accentColor }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="h-3 w-28 animate-pulse rounded-full bg-foreground/[0.06]" />
        <div className="size-8 animate-pulse rounded-lg bg-foreground/[0.05]" />
      </div>
      <div className="mt-5 h-9 w-32 animate-pulse rounded-md bg-foreground/[0.07]" />
      <div className="mt-3 h-3 w-44 animate-pulse rounded-full bg-foreground/[0.05]" />
    </div>
  );
}
