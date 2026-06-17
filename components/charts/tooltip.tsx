"use client";

import { formatVolume, formatVolumeFull } from "./format";

export type TooltipPayloadItem = {
  dataKey: string;
  value: number;
  color: string;
  name: string;
};

// Shared chart tooltip. Used by Bar, Line, Area, and Pie primitives so the
// hover affordance reads identically across every chart surface.
export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  // Optional label formatter. Caller passes formatMonthShort for ISO month
  // axes; default is identity. Kept narrow to avoid coupling the tooltip to
  // any one axis convention.
  formatLabel?: (label: string) => string;
  // Optional value formatter. Defaults to compact volume (1.2M style).
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const renderedLabel = label
    ? formatLabel
      ? formatLabel(label)
      : label
    : null;
  const valueFormatter = formatValue ?? formatVolume;
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 px-3.5 py-2.5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur">
      {renderedLabel && (
        <div className="mb-1.5 font-medium text-[12px] text-foreground tracking-tight">
          {renderedLabel}
        </div>
      )}
      {payload.map((entry) => (
        <div
          className="flex items-center gap-2.5 py-0.5 text-[12px]"
          key={entry.dataKey}
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground/55">{entry.name}</span>
          <span
            className="ml-auto font-mono tabular-nums text-foreground"
            title={formatVolumeFull(entry.value)}
          >
            {valueFormatter(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
