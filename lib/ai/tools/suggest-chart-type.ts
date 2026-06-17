import type { ChartType, Column, Row } from "@/components/charts/types";

const TEMPORAL = new Set(["DATE", "DATETIME", "TIMESTAMP"]);
const NUMERIC = new Set([
  "INT64",
  "INTEGER",
  "FLOAT64",
  "FLOAT",
  "NUMERIC",
  "BIGNUMERIC",
]);
const TEXTUAL = new Set(["STRING", "BYTES"]);

// Heuristic for picking a default chart kind from a result's shape:
//
//  1. `area` is chosen instead of `line` when there are exactly two numeric
//     series on a temporal x-axis (a paired time-series look).
//  2. empty result sets render as `table` rather than a fabricated chart.
//
// The model can override via the optional chartType input on the tool, and the
// visualisation prompt rails tell it when to do so. Kept as a pure function so
// it is callable from any context and unit-testable in isolation.
export function suggestChartType(columns: Column[], rows: Row[]): ChartType {
  const rowCount = rows.length;
  const colCount = columns.length;

  if (rowCount === 0) {
    return "table";
  }

  if (rowCount === 1 && colCount === 1) {
    return "metric";
  }

  if (colCount < 2) {
    return "table";
  }

  const firstColType = (columns[0]?.type ?? "").toUpperCase();

  // Temporal x-axis: line (or area when two paired numeric series).
  if (TEMPORAL.has(firstColType)) {
    if (
      colCount === 3 &&
      NUMERIC.has((columns[1]?.type ?? "").toUpperCase()) &&
      NUMERIC.has((columns[2]?.type ?? "").toUpperCase())
    ) {
      return "area";
    }
    return "line";
  }

  // Small categorical: pie. The prompt also tells the model to avoid pie when
  // shares are near-equal and >6; the heuristic stays conservative on row
  // count and lets the model override.
  if (rowCount <= 7 && colCount === 2) {
    return "pie";
  }

  // Text-heavy first column: table. Captures description / long-name results
  // that read better as a list than a chart.
  if (TEXTUAL.has(firstColType)) {
    const samples = rows
      .slice(0, 20)
      .map((r) => r[0])
      .filter((v): v is string | number => v != null);
    if (samples.length > 0) {
      const totalLen = samples.reduce<number>(
        (acc, v) => acc + String(v).length,
        0
      );
      const avgLen = totalLen / samples.length;
      if (avgLen > 30) {
        return "table";
      }
    }
  }

  return "bar";
}
