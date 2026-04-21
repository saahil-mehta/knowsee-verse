"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PRINT_CHART_HEIGHT,
  PRINT_CHART_WIDTH,
  usePrintMode,
} from "@/lib/print-mode";
import type { BarChartSection } from "../types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function BarChartBlock({
  title,
  description,
  data,
  bars,
  categoryKey,
  layout = "vertical",
}: BarChartSection) {
  const isPrint = usePrintMode();
  if (!Array.isArray(data) || !Array.isArray(bars)) {
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
          <BarChart
            data={data}
            layout={layout === "horizontal" ? "vertical" : "horizontal"}
          >
            <CartesianGrid opacity={0.3} strokeDasharray="3 3" />
            {layout === "horizontal" ? (
              <>
                <YAxis
                  dataKey={categoryKey}
                  tick={{ fontSize: 12 }}
                  type="category"
                  width={120}
                />
                <XAxis tick={{ fontSize: 12 }} type="number" />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={categoryKey}
                  tick={{ fontSize: 12 }}
                  type="category"
                />
                <YAxis tick={{ fontSize: 12 }} type="number" />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            {bars.map((bar, i) => (
              <Bar
                dataKey={bar.dataKey}
                fill={bar.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                key={bar.dataKey}
                name={bar.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
