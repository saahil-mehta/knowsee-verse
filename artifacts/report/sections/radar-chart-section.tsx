"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  PRINT_CHART_HEIGHT,
  PRINT_CHART_WIDTH,
  usePrintMode,
} from "@/lib/print-mode";
import type { RadarChartSection } from "../types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RadarChartBlock({
  title,
  description,
  data,
  radars,
  angleKey,
}: RadarChartSection) {
  const isPrint = usePrintMode();
  if (!Array.isArray(data) || !Array.isArray(radars)) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div
        className="mt-4 h-80"
        style={
          isPrint
            ? { width: PRINT_CHART_WIDTH, height: PRINT_CHART_HEIGHT }
            : undefined
        }
      >
        <ResponsiveContainer
          height={isPrint ? PRINT_CHART_HEIGHT : "100%"}
          width={isPrint ? PRINT_CHART_WIDTH : "100%"}
        >
          <RadarChart data={data}>
            <PolarGrid opacity={0.3} />
            <PolarAngleAxis dataKey={angleKey} tick={{ fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            {radars.map((radar, i) => (
              <Radar
                dataKey={radar.dataKey}
                fill={radar.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.15}
                key={radar.dataKey}
                name={radar.label}
                stroke={radar.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
