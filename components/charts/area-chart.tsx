"use client";

import {
  Area,
  CartesianGrid,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonthShort, formatVolume } from "./format";
import { paletteColour } from "./palette";
import { ChartTooltip } from "./tooltip";
import { type Column, isTemporalType, type Row, toSeriesValue } from "./types";

type DataPoint = Record<string, string | number>;

// Stable gradient ids derived from the series name so multiple area charts on
// the same page do not collide on SVG ids. Recharts renders all gradients
// into a shared <defs/>, so a per-chart suffix is the simplest defence.
function gradientId(chartId: string, dataKey: string): string {
  return `g-${chartId}-${dataKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

let __chartCounter = 0;
function nextChartId(): string {
  __chartCounter = (__chartCounter + 1) % 1_000_000;
  return `c${__chartCounter.toString(36)}`;
}

// Area chart primitive. Same input shape as LineChart. Used for paired-series
// time-series patterns and any time series where the fill area is desirable.
export function AreaChart({
  columns,
  rows,
  height = 288,
  emptyHint = "No data in this view.",
  colours,
}: {
  columns: Column[];
  rows: Row[];
  height?: number;
  emptyHint?: string;
  // Per-series colour overrides. Length should match columns.length - 1 (one
  // colour per non-x-axis series). Falls back to paletteColour when omitted.
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

  const [xCol, ...seriesCols] = columns;
  const isTemporal = isTemporalType(xCol.type);
  const chartId = nextChartId();
  const series = seriesCols.map((c, i) => ({
    dataKey: c.name,
    name: c.name,
    color: colours?.[i] ?? paletteColour(i),
    gradientId: gradientId(chartId, c.name),
  }));

  const data: DataPoint[] = rows.map((r) => {
    const obj: DataPoint = {};
    columns.forEach((c, i) => {
      if (i === 0) {
        const v = r[0];
        obj[c.name] = v == null ? "" : String(v);
        return;
      }
      obj[c.name] = toSeriesValue(r[i]);
    });
    return obj;
  });

  return (
    <div className="w-full text-foreground" style={{ height }}>
      {/* Numeric height (not "100%") so the first pre-measurement frame has a
          positive dimension and recharts doesn't log its width(-1) warning;
          width stays responsive. */}
      <ResponsiveContainer height={height} width="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                id={s.gradientId}
                key={s.gradientId}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            stroke="currentColor"
            strokeDasharray="2 4"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey={xCol.name}
            tick={{ fill: "currentColor", fillOpacity: 0.55, fontSize: 11 }}
            tickFormatter={isTemporal ? formatMonthShort : undefined}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "currentColor", fillOpacity: 0.55, fontSize: 11 }}
            tickFormatter={(v: number) => formatVolume(v)}
            tickLine={false}
            width={56}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatLabel={isTemporal ? formatMonthShort : undefined}
              />
            }
            cursor={{
              stroke: "currentColor",
              strokeOpacity: 0.18,
              strokeWidth: 1,
            }}
          />
          {series.map((s) => (
            <Area
              dataKey={s.dataKey}
              fill={`url(#${s.gradientId})`}
              // Recharts 3.x + React 19 animation render loop; see bar-chart.
              isAnimationActive={false}
              key={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={1.75}
              type={isTemporal ? "monotone" : "linear"}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
