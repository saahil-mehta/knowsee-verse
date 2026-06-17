"use client";

import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { paletteColour } from "./palette";
import { ChartTooltip } from "./tooltip";
import { type Column, type Row, toSeriesValue } from "./types";

type DataPoint = { name: string; value: number };

// Pie chart primitive. Two columns expected: label and value. Only renders
// when the data set is small (<=7 slices) and reasonably balanced; the
// heuristic upstream is responsible for not picking pie when shares are
// near-equal and tiny.
export function PieChart({
  columns,
  rows,
  height = 288,
  emptyHint = "No data in this view.",
}: {
  columns: Column[];
  rows: Row[];
  height?: number;
  emptyHint?: string;
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

  const data: DataPoint[] = rows.map((r) => ({
    name: String(r[0] ?? ""),
    value: toSeriesValue(r[1] ?? null),
  }));

  return (
    <div className="w-full text-foreground" style={{ height }}>
      {/* Numeric height (not "100%") so the first pre-measurement frame has a
          positive dimension and recharts doesn't log its width(-1) warning;
          width stays responsive. */}
      <ResponsiveContainer height={height} width="100%">
        <RechartsPieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius="55%"
            isAnimationActive={false}
            nameKey="name"
            outerRadius="85%"
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((slice, i) => (
              <Cell fill={paletteColour(i)} key={slice.name} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
