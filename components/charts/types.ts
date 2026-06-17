// Generic shape that flows from a data-query tool's output into the
// ChartByType dispatcher. Adapters in the individual primitives convert this
// into the dataKey-based shape Recharts wants.

export type ColumnType =
  | "STRING"
  | "INT64"
  | "INTEGER"
  | "FLOAT64"
  | "FLOAT"
  | "NUMERIC"
  | "BIGNUMERIC"
  | "BOOL"
  | "BOOLEAN"
  | "DATE"
  | "DATETIME"
  | "TIMESTAMP"
  | "TIME"
  | "BYTES"
  | (string & {}); // Allow unknown future column types without losing the named union for autocomplete.

export type Column = {
  name: string;
  type: ColumnType;
};

export type CellValue = string | number | boolean | null;
export type Row = CellValue[];

export const CHART_TYPES = [
  "metric",
  "line",
  "area",
  "bar",
  "pie",
  "table",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export type ChartByTypeProps = {
  chartType: ChartType;
  columns: Column[];
  rows: Row[];
  title?: string;
  emptyHint?: string;
};

// Coerce a cell to a finite number for plotting on a numeric axis. Defence
// in depth against upstream coercion failing (a warehouse may return INT64 as
// a string and NUMERIC as a big-decimal object; if the column-type pathway
// ever falls back to STRING, the primitives still produce visible bars instead
// of zero-length ones on an index-based axis fallback).
export function toSeriesValue(v: CellValue): number {
  if (v == null) {
    return 0;
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }
  if (typeof v === "string") {
    if (v.length === 0) {
      return 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "boolean") {
    return v ? 1 : 0;
  }
  return 0;
}

// True when the column type names a temporal axis. Used by the heuristic and
// by chart primitives that pick monotone interpolation only for time series.
export function isTemporalType(type: ColumnType): boolean {
  const t = type.toUpperCase();
  return t === "DATE" || t === "DATETIME" || t === "TIMESTAMP";
}

// True when the column type names a numeric axis. Used by the heuristic to
// avoid placing strings on a numeric y-axis.
export function isNumericType(type: ColumnType): boolean {
  const t = type.toUpperCase();
  return (
    t === "INT64" ||
    t === "INTEGER" ||
    t === "FLOAT64" ||
    t === "FLOAT" ||
    t === "NUMERIC" ||
    t === "BIGNUMERIC"
  );
}
