import type { CellValue, Row } from "@/components/charts/types";
import type { ResultColumn } from "./types";

const NUMERIC_TYPES = new Set([
  "INT64",
  "INTEGER",
  "FLOAT64",
  "FLOAT",
  "NUMERIC",
  "BIGNUMERIC",
]);

const TEMPORAL_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIME"]);

// Coerces a BigQuery cell to a JSON-safe Number, or null if non-numeric.
// BigQuery's JS client returns INT64 as a string (precision-preserving) and
// NUMERIC/BIGNUMERIC as Big.js instances; both must become numbers before
// they reach recharts, otherwise the bars vanish silently because strings on
// a numeric axis fall back to the row-index domain.
function toNumberOrNull(v: unknown): number | null {
  if (v == null) {
    return null;
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "boolean") {
    return v ? 1 : 0;
  }
  if (typeof v === "string") {
    if (v.length === 0) {
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    // BQ wrappers like { value: "2025-01-01" } or Big.js instances.
    if ("value" in v) {
      const inner = (v as { value: unknown }).value;
      return toNumberOrNull(inner);
    }
    const n = Number(String(v));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Converts a BigQuery cell to a chart-safe CellValue, using the column type
// to drive coercion:
//  - Numeric types coerce string / Big.js to number so axes work.
//  - Temporal types coerce Date / BQ wrappers to ISO string for stable keys.
//  - Booleans pass through.
//  - Everything else falls back to String(v).
export function toChartCell(value: unknown, type: string): CellValue {
  if (value == null) {
    return null;
  }
  const upper = type.toUpperCase();

  if (NUMERIC_TYPES.has(upper)) {
    return toNumberOrNull(value);
  }

  if (TEMPORAL_TYPES.has(upper)) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object" && value !== null && "value" in value) {
      const inner = (value as { value: unknown }).value;
      if (typeof inner === "string") {
        return inner;
      }
    }
    return String(value);
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (
      typeof inner === "string" ||
      typeof inner === "number" ||
      typeof inner === "boolean"
    ) {
      return inner;
    }
  }
  return String(value);
}

// Converts a single BigQuery result row (object keyed by column name) to a
// chart-friendly positional cell array using the column order and types.
export function toChartRow(
  row: Record<string, unknown>,
  columns: ResultColumn[]
): Row {
  return columns.map((c) => toChartCell(row[c.name], c.type));
}

export function toChartRows(
  rows: Record<string, unknown>[],
  columns: ResultColumn[]
): Row[] {
  return rows.map((r) => toChartRow(r, columns));
}
