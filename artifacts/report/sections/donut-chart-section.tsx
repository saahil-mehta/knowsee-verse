"use client";

import { Cell, Label, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  PRINT_CHART_HEIGHT,
  PRINT_CHART_WIDTH,
  usePrintMode,
} from "@/lib/print-mode";
import type { DonutChartSection } from "../types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DonutChartBlock({
  title,
  description,
  data,
  centerLabel,
  centerValue,
}: DonutChartSection) {
  const isPrint = usePrintMode();
  if (!Array.isArray(data)) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div
        className="mt-4 h-72"
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
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={70}
              // Recharts' default 1500ms sweep leaves the arc partially
              // rendered at Puppeteer screenshot time: the PDF is captured
              // a few hundred ms after mount, well before the animation
              // completes. Disable it for print only. In-app rendering is
              // unaffected by screenshot timing so the sweep stays on.
              isAnimationActive={!isPrint}
              nameKey="name"
              outerRadius={100}
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell
                  fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                  key={entry.name}
                />
              ))}
              {(centerLabel || centerValue) && (
                <Label
                  content={() => (
                    <text
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x="50%"
                      y="50%"
                    >
                      {centerValue && (
                        <tspan
                          className="fill-foreground text-2xl font-bold"
                          dy="-0.5em"
                          x="50%"
                        >
                          {centerValue}
                        </tspan>
                      )}
                      {centerLabel && (
                        <tspan
                          className="fill-muted-foreground text-xs"
                          dy={centerValue ? "1.5em" : "0"}
                          x="50%"
                        >
                          {centerLabel}
                        </tspan>
                      )}
                    </text>
                  )}
                />
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        {data.map((entry, i) => (
          <div className="flex items-center gap-2 text-sm" key={entry.name}>
            <span
              className="inline-block size-3 rounded-full"
              style={{
                backgroundColor:
                  entry.color ?? CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
