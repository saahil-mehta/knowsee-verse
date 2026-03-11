"use client";

import { useMemo } from "react";
import { BarChartBlock } from "./sections/bar-chart-section";
import { DonutChartBlock } from "./sections/donut-chart-section";
import { SectionHeader } from "./sections/header";
import { KPIRow } from "./sections/kpi-row";
import { RadarChartBlock } from "./sections/radar-chart-section";
import { RecommendationList } from "./sections/recommendations";
import { DataTable } from "./sections/table-section";
import { TextBlock } from "./sections/text-section";
import type {
  BarChartSection,
  DonutChartSection,
  KPIRowSection,
  RadarChartSection,
  RecommendationSection,
  ReportData,
  ReportSection,
  TableSection,
} from "./types";

function ReportSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-1/3 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="h-24 animate-pulse rounded-lg bg-muted-foreground/20"
            key={`kpi-${i}`}
          />
        ))}
      </div>
      <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="mt-4 h-48 animate-pulse rounded-lg bg-muted-foreground/20" />
    </div>
  );
}

// ─── Normalisation ──────────────────────────────────────────────────────────
// Models produce reasonable but inconsistent field names. These functions
// map common variations to the canonical shapes our components expect.

type RawSection = Record<string, unknown>;

function normaliseKPIRow(raw: RawSection): KPIRowSection {
  // Model may use "kpis", "metrics", or "items"
  const source = (raw.items ?? raw.kpis ?? raw.metrics) as
    | Record<string, unknown>[]
    | undefined;
  const items = Array.isArray(source)
    ? source.map((k) => ({
        label: String(k.label ?? k.name ?? ""),
        value: (k.value as string | number) ?? "",
        change: k.change
          ? String(k.change)
          : k.trendValue
            ? String(k.trendValue)
            : k.unit
              ? String(k.unit)
              : undefined,
        trend: (k.trend as "up" | "down" | "neutral") ?? undefined,
      }))
    : [];
  return { type: "kpi-row", items };
}

function normaliseBarChart(raw: RawSection): BarChartSection {
  const data = raw.data as Record<string, unknown>[];
  // Model may provide "bars" (our format) or "dataKeys" (string[])
  const categoryKey = String(
    raw.categoryKey ?? raw.xKey ?? raw.categoryField ?? "name"
  );
  let bars: BarChartSection["bars"];
  if (Array.isArray(raw.bars) && typeof raw.bars[0] === "object") {
    bars = raw.bars as BarChartSection["bars"];
  } else {
    // "dataKeys" is a string[] of the data series names
    const keys = (raw.dataKeys ?? raw.series ?? raw.bars) as
      | string[]
      | undefined;
    if (Array.isArray(keys)) {
      bars = keys.map((k) => ({
        dataKey: String(k),
        label: String(k),
      }));
    } else if (Array.isArray(data) && data.length > 0) {
      // Infer bars from data keys, excluding the category key
      bars = Object.keys(data[0])
        .filter((k) => k !== categoryKey)
        .map((k) => ({ dataKey: k, label: k }));
    } else {
      bars = [];
    }
  }
  return {
    type: "bar-chart",
    title: String(raw.title ?? ""),
    description: raw.description ? String(raw.description) : undefined,
    data: Array.isArray(data) ? data : [],
    bars,
    categoryKey,
    layout: (raw.layout as "horizontal" | "vertical") ?? undefined,
  };
}

function normaliseRadarChart(raw: RawSection): RadarChartSection {
  const data = raw.data as Record<string, unknown>[];
  // Infer angleKey from data: the first string-valued key in the first row
  let angleKey = String(
    raw.angleKey ?? raw.axisKey ?? raw.angleField ?? "name"
  );
  if (
    !raw.angleKey &&
    !raw.axisKey &&
    !raw.angleField &&
    Array.isArray(data) &&
    data.length > 0
  ) {
    const firstRow = data[0];
    for (const [k, v] of Object.entries(firstRow)) {
      if (typeof v === "string") {
        angleKey = k;
        break;
      }
    }
  }

  let radars: RadarChartSection["radars"];
  if (Array.isArray(raw.radars) && typeof raw.radars[0] === "object") {
    radars = raw.radars as RadarChartSection["radars"];
  } else {
    const keys = (raw.dataKeys ?? raw.series ?? raw.radars) as
      | string[]
      | undefined;
    if (Array.isArray(keys)) {
      radars = keys.map((k) => ({
        dataKey: String(k),
        label: String(k),
      }));
    } else if (Array.isArray(data) && data.length > 0) {
      radars = Object.keys(data[0])
        .filter((k) => k !== angleKey)
        .map((k) => ({ dataKey: k, label: k }));
    } else {
      radars = [];
    }
  }
  return {
    type: "radar-chart",
    title: String(raw.title ?? ""),
    description: raw.description ? String(raw.description) : undefined,
    data: Array.isArray(data) ? data : [],
    radars,
    angleKey,
  };
}

function normaliseDonutChart(raw: RawSection): DonutChartSection {
  const data = raw.data as { name: string; value: number; color?: string }[];
  return {
    type: "donut-chart",
    title: String(raw.title ?? ""),
    description: raw.description ? String(raw.description) : undefined,
    data: Array.isArray(data) ? data : [],
    centerLabel: raw.centerLabel ? String(raw.centerLabel) : undefined,
    centerValue: (raw.centerValue as string | number) ?? undefined,
  };
}

function normaliseTable(raw: RawSection): TableSection {
  // Model may use "columns" (our format) or "headers" (string[])
  let columns: TableSection["columns"];
  let rows: TableSection["rows"];

  if (
    Array.isArray(raw.columns) &&
    raw.columns.length > 0 &&
    typeof raw.columns[0] === "object"
  ) {
    columns = raw.columns as TableSection["columns"];
  } else {
    // "headers" is a string[]
    const headers = (raw.headers ?? raw.columns) as string[] | undefined;
    columns = Array.isArray(headers)
      ? headers.map((h) => ({ key: String(h), label: String(h) }))
      : [];
  }

  const rawRows = raw.rows as unknown[] | undefined;
  if (Array.isArray(rawRows) && rawRows.length > 0) {
    if (Array.isArray(rawRows[0])) {
      // Rows are string[][] -- zip with column keys
      rows = (rawRows as unknown[][]).map((row) => {
        const obj: Record<string, unknown> = {};
        for (let c = 0; c < columns.length; c++) {
          obj[columns[c].key] = row[c] ?? "";
        }
        return obj;
      });
    } else {
      rows = rawRows as Record<string, unknown>[];
    }
  } else {
    rows = [];
  }

  return {
    type: "table",
    title: raw.title ? String(raw.title) : undefined,
    columns,
    rows,
  };
}

function normaliseRecommendations(raw: RawSection): RecommendationSection {
  // Model may use "groups" (our format) or flat "items" with priority field
  if (Array.isArray(raw.groups)) {
    return raw as unknown as RecommendationSection;
  }

  // Flat items with priority/title/description
  const items = raw.items as Record<string, unknown>[] | undefined;
  if (!Array.isArray(items)) {
    return {
      type: "recommendations",
      title: String(raw.title ?? "Recommendations"),
      groups: [],
    };
  }

  // Group by priority/tier
  const tierMap: Record<
    string,
    { action: string; reason: string; impact: string }[]
  > = {};
  for (const item of items) {
    const rawTier = String(
      item.priority ?? item.tier ?? item.level ?? "medium"
    ).toLowerCase();
    // Normalise tier names: "critical"/"high" -> "high", etc.
    let tier: "high" | "medium" | "low";
    if (rawTier === "critical" || rawTier === "high") {
      tier = "high";
    } else if (rawTier === "low") {
      tier = "low";
    } else {
      tier = "medium";
    }
    if (!tierMap[tier]) {
      tierMap[tier] = [];
    }
    tierMap[tier].push({
      action: String(item.action ?? item.title ?? item.name ?? ""),
      reason: String(item.reason ?? item.description ?? item.rationale ?? ""),
      impact: String(item.impact ?? item.effect ?? ""),
    });
  }

  const tierOrder: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
  const groups = tierOrder
    .filter((t) => tierMap[t])
    .map((tier) => ({ tier, items: tierMap[tier] }));

  return {
    type: "recommendations",
    title: String(raw.title ?? "Recommendations"),
    groups,
  };
}

/**
 * Normalise a raw section from model JSON into our canonical types.
 */
function normaliseSection(raw: RawSection): ReportSection | null {
  if (!raw || typeof raw !== "object" || !raw.type) {
    return null;
  }

  switch (raw.type) {
    case "header":
    case "text":
      return raw as unknown as ReportSection;
    case "kpi-row":
      return normaliseKPIRow(raw);
    case "bar-chart":
      return normaliseBarChart(raw);
    case "donut-chart":
      return normaliseDonutChart(raw);
    case "radar-chart":
      return normaliseRadarChart(raw);
    case "table":
      return normaliseTable(raw);
    case "recommendations":
      return normaliseRecommendations(raw);
    default:
      return null;
  }
}

// ─── Rendering ──────────────────────────────────────────────────────────────

function renderSection(section: ReportSection, index: number) {
  switch (section.type) {
    case "header":
      return <SectionHeader key={`section-${index}`} {...section} />;
    case "kpi-row":
      return <KPIRow key={`section-${index}`} {...section} />;
    case "bar-chart":
      return <BarChartBlock key={`section-${index}`} {...section} />;
    case "donut-chart":
      return <DonutChartBlock key={`section-${index}`} {...section} />;
    case "radar-chart":
      return <RadarChartBlock key={`section-${index}`} {...section} />;
    case "text":
      return <TextBlock key={`section-${index}`} {...section} />;
    case "table":
      return <DataTable key={`section-${index}`} {...section} />;
    case "recommendations":
      return <RecommendationList key={`section-${index}`} {...section} />;
    default:
      return null;
  }
}

export function ReportRenderer({
  content,
  status,
}: {
  content: string;
  status: "streaming" | "idle";
}) {
  const reportData = useMemo<ReportData | null>(() => {
    if (!content) {
      return null;
    }
    try {
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      // Normalise each section to our canonical types
      const sections = Array.isArray(parsed.sections)
        ? (parsed.sections as RawSection[])
            .map(normaliseSection)
            .filter((s): s is ReportSection => s !== null)
        : [];
      return {
        title: parsed.title ?? "",
        subtitle: parsed.subtitle,
        date: parsed.date,
        sections,
      };
    } catch {
      return null;
    }
  }, [content]);

  if (!reportData) {
    if (status === "streaming") {
      return <ReportSkeleton />;
    }
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        No report data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6" data-report-content>
      {reportData.title && (
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {reportData.title}
          </h1>
          {reportData.subtitle && (
            <p className="mt-1 text-muted-foreground">{reportData.subtitle}</p>
          )}
          {reportData.date && (
            <p className="mt-1 text-xs text-muted-foreground">
              {reportData.date}
            </p>
          )}
        </div>
      )}
      {reportData.sections.map((section, i) => renderSection(section, i))}
    </div>
  );
}
