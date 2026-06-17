"use client";

import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatVolume } from "./format";
import { paletteColour } from "./palette";
import { ChartTooltip } from "./tooltip";
import { type Column, type Row, toSeriesValue } from "./types";

export type BarLayout = "horizontal" | "vertical";

type DataPoint = Record<string, string | number>;

// Bar chart primitive. Layout "horizontal" = bars run left-to-right with
// category labels on the y-axis (the breakdown-bars look). Layout "vertical" =
// bars run bottom-to-top with categories on the x-axis (classic histogram /
// ranking look).
export function BarChart({
  columns,
  rows,
  layout = "horizontal",
  height = 288,
  emptyHint = "No data in this view.",
  stackId,
  colours,
}: {
  columns: Column[];
  rows: Row[];
  layout?: BarLayout;
  height?: number;
  emptyHint?: string;
  // When provided, stacks multiple series into one bar per category. Default
  // leaves series grouped side by side.
  stackId?: string;
  // Per-series colour overrides; one per non-category column. Falls back to
  // paletteColour when omitted.
  colours?: readonly string[];
}) {
  if (rows.length === 0 || columns.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[13px] text-foreground/45"
        style={{ height }}
      >
        {emptyHint}
      </div>
    );
  }

  const [categoryCol, ...seriesCols] = columns;
  const series = seriesCols.map((c, i) => ({
    dataKey: c.name,
    name: c.name,
    color: colours?.[i] ?? paletteColour(i),
  }));

  // Pivot row arrays into recharts-friendly objects keyed by column name.
  // Series columns (i > 0) coerce to Number so a STRING-typed INT64 still
  // plots correctly even if upstream type information was lost.
  const data: DataPoint[] = rows.map((r) => {
    const obj: DataPoint = {};
    columns.forEach((c, i) => {
      if (i === 0) {
        return; // category handled below
      }
      obj[c.name] = toSeriesValue(r[i]);
    });
    const raw = String(r[0] ?? "");
    obj.__category = raw;
    obj[categoryCol.name] = raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
    return obj;
  });

  // Recharts uses inverted layout names: layout="horizontal" means axes are
  // laid out horizontally (categories on X), which renders vertical bars (a
  // column chart). layout="vertical" means horizontal bars (a ranking view).
  // Map this primitive's intent-named prop to recharts's convention so
  // "horizontal" here unambiguously means "bars run left to right".
  const horizontalBars = layout === "horizontal";
  const rechartsLayout = horizontalBars ? "vertical" : "horizontal";

  // Both axes are rendered unconditionally (no fragment wrapper). Recharts's
  // child-introspection only reads direct children of the chart, so wrapping
  // axes in a fragment inside a ternary can silently drop their dataKey and
  // collapse category positions to row index. Conditional props inline keep
  // each axis a single direct child.
  const tickStyle = {
    fill: "currentColor",
    fillOpacity: 0.55,
    fontSize: 11,
  } as const;
  const categoryTickStyle = {
    fill: "currentColor",
    fillOpacity: 0.75,
    fontSize: 11,
  } as const;

  return (
    <div className="w-full text-foreground" style={{ height }}>
      {/* Numeric height (not "100%") so the first pre-measurement frame has a
          positive dimension and recharts doesn't log its width(-1) warning;
          width stays responsive. */}
      <ResponsiveContainer height={height} width="100%">
        <RechartsBarChart
          data={data}
          layout={rechartsLayout}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            horizontal={!horizontalBars}
            stroke="currentColor"
            strokeDasharray="2 4"
            strokeOpacity={0.08}
            vertical={horizontalBars}
          />
          <XAxis
            axisLine={false}
            dataKey={horizontalBars ? undefined : categoryCol.name}
            tick={horizontalBars ? tickStyle : categoryTickStyle}
            tickFormatter={
              horizontalBars ? (v: number) => formatVolume(v) : undefined
            }
            tickLine={false}
            type={horizontalBars ? "number" : "category"}
          />
          <YAxis
            axisLine={false}
            dataKey={horizontalBars ? categoryCol.name : undefined}
            tick={horizontalBars ? categoryTickStyle : tickStyle}
            tickFormatter={
              horizontalBars ? undefined : (v: number) => formatVolume(v)
            }
            tickLine={false}
            type={horizontalBars ? "category" : "number"}
            width={horizontalBars ? 140 : 56}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          />
          {series.map((s) => (
            <Bar
              dataKey={s.dataKey}
              fill={s.color}
              // Recharts 3.x + React 19: bar animation drives a setState loop
              // ("Maximum update depth exceeded"). Disabling animation breaks
              // the loop, matching the existing fix on pie-chart.
              isAnimationActive={false}
              key={s.dataKey}
              name={s.name}
              radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              stackId={stackId}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
