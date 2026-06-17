import { describe, expect, it } from "vitest";
import type { Column, Row } from "@/components/charts/types";
import {
  isNumericType,
  isTemporalType,
  toSeriesValue,
} from "@/components/charts/types";
import { suggestChartType } from "./suggest-chart-type";

const col = (name: string, type: string): Column => ({ name, type });

describe("suggestChartType", () => {
  it("returns table for an empty result set", () => {
    expect(suggestChartType([col("anything", "STRING")], [])).toBe("table");
  });

  it("returns metric for a single scalar cell", () => {
    expect(suggestChartType([col("total", "INT64")], [[42]])).toBe("metric");
  });

  it("returns table when there is only one column but many rows", () => {
    const rows: Row[] = [["a"], ["b"], ["c"]];
    expect(suggestChartType([col("name", "STRING")], rows)).toBe("table");
  });

  it("returns line for a temporal x-axis with one numeric series", () => {
    const cols = [col("month", "DATE"), col("visits", "INT64")];
    const rows: Row[] = [
      ["2025-01-01", 10],
      ["2025-02-01", 20],
    ];
    expect(suggestChartType(cols, rows)).toBe("line");
  });

  it("returns area for a temporal x-axis with two paired numeric series", () => {
    const cols = [
      col("month", "DATE"),
      col("opened", "INT64"),
      col("closed", "INT64"),
    ];
    const rows: Row[] = [
      ["2025-01-01", 10, 4],
      ["2025-02-01", 20, 9],
    ];
    expect(suggestChartType(cols, rows)).toBe("area");
  });

  it("returns line (not area) for a temporal x-axis with a non-numeric third column", () => {
    const cols = [
      col("month", "DATE"),
      col("visits", "INT64"),
      col("label", "STRING"),
    ];
    const rows: Row[] = [["2025-01-01", 10, "launch"]];
    expect(suggestChartType(cols, rows)).toBe("line");
  });

  it("returns pie for a small two-column categorical breakdown", () => {
    const cols = [col("channel", "STRING"), col("share", "FLOAT64")];
    const rows: Row[] = [
      ["search", 0.6],
      ["social", 0.3],
      ["email", 0.1],
    ];
    expect(suggestChartType(cols, rows)).toBe("pie");
  });

  it("returns table when the first column is long free text", () => {
    const cols = [col("description", "STRING"), col("score", "FLOAT64")];
    const rows: Row[] = Array.from({ length: 10 }, (_, i) => [
      `This is a fairly long descriptive sentence number ${i} that exceeds the threshold`,
      i,
    ]);
    expect(suggestChartType(cols, rows)).toBe("table");
  });

  it("returns bar for a wide categorical result with short labels", () => {
    const cols = [
      col("brand", "STRING"),
      col("q1", "INT64"),
      col("q2", "INT64"),
    ];
    const rows: Row[] = [
      ["acme", 10, 12],
      ["globex", 8, 9],
      ["initech", 5, 7],
    ];
    expect(suggestChartType(cols, rows)).toBe("bar");
  });
});

describe("toSeriesValue", () => {
  it("passes finite numbers through unchanged", () => {
    expect(toSeriesValue(12.5)).toBe(12.5);
  });

  it("coerces numeric strings (warehouse INT64-as-string)", () => {
    expect(toSeriesValue("1024")).toBe(1024);
  });

  it("returns 0 for null, empty string, and non-numeric strings", () => {
    expect(toSeriesValue(null)).toBe(0);
    expect(toSeriesValue("")).toBe(0);
    expect(toSeriesValue("n/a")).toBe(0);
  });

  it("returns 0 for non-finite numbers", () => {
    expect(toSeriesValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toSeriesValue(Number.NaN)).toBe(0);
  });

  it("maps booleans to 1 and 0", () => {
    expect(toSeriesValue(true)).toBe(1);
    expect(toSeriesValue(false)).toBe(0);
  });
});

describe("type predicates", () => {
  it("isTemporalType matches date-like types case-insensitively", () => {
    expect(isTemporalType("DATE")).toBe(true);
    expect(isTemporalType("timestamp")).toBe(true);
    expect(isTemporalType("STRING")).toBe(false);
  });

  it("isNumericType matches numeric types and rejects others", () => {
    expect(isNumericType("INT64")).toBe(true);
    expect(isNumericType("numeric")).toBe(true);
    expect(isNumericType("DATE")).toBe(false);
    expect(isNumericType("STRING")).toBe(false);
  });
});
