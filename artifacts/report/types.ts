export type ReportData = {
  title: string;
  subtitle?: string;
  date?: string;
  sections: ReportSection[];
};

export type ReportSection =
  | HeaderSection
  | KPIRowSection
  | BarChartSection
  | DonutChartSection
  | RadarChartSection
  | TextSection
  | TableSection
  | RecommendationSection;

export type HeaderSection = {
  type: "header";
  title: string;
  subtitle?: string;
};

export type KPIRowSection = {
  type: "kpi-row";
  items: {
    label: string;
    value: string | number;
    change?: string;
    trend?: "up" | "down" | "neutral";
  }[];
};

export type BarChartSection = {
  type: "bar-chart";
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  bars: { dataKey: string; label: string; color?: string }[];
  categoryKey: string;
  layout?: "horizontal" | "vertical";
};

export type DonutChartSection = {
  type: "donut-chart";
  title: string;
  description?: string;
  data: { name: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string | number;
};

export type RadarChartSection = {
  type: "radar-chart";
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  radars: { dataKey: string; label: string; color?: string }[];
  angleKey: string;
};

export type TextSection = {
  type: "text";
  title?: string;
  content: string;
};

export type TableSection = {
  type: "table";
  title?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

export type RecommendationSection = {
  type: "recommendations";
  title: string;
  groups: {
    tier: "high" | "medium" | "low";
    items: { action: string; reason: string; impact: string }[];
  }[];
};
