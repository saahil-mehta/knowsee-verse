import { describe, expect, it } from "vitest";
import { toChartCell, toChartRow } from "./result-rows";
import type { ResultColumn } from "./types";

describe("toChartCell", () => {
  it("returns null for null/undefined regardless of type", () => {
    expect(toChartCell(null, "INT64")).toBeNull();
    expect(toChartCell(undefined, "STRING")).toBeNull();
  });

  it("coerces INT64-as-string to a number (BQ precision-preserving form)", () => {
    expect(toChartCell("1024", "INT64")).toBe(1024);
  });

  it("unwraps a Big.js-style { value } object for NUMERIC", () => {
    expect(toChartCell({ value: "3.14" }, "NUMERIC")).toBeCloseTo(3.14);
  });

  it("returns null for a non-numeric string on a numeric column", () => {
    expect(toChartCell("n/a", "FLOAT64")).toBeNull();
  });

  it("renders a Date temporal cell as an ISO string", () => {
    const d = new Date("2025-03-01T00:00:00.000Z");
    expect(toChartCell(d, "TIMESTAMP")).toBe("2025-03-01T00:00:00.000Z");
  });

  it("unwraps a BQ { value } wrapper for a DATE column", () => {
    expect(toChartCell({ value: "2025-03-01" }, "DATE")).toBe("2025-03-01");
  });

  it("passes strings and booleans through on non-typed columns", () => {
    expect(toChartCell("acme", "STRING")).toBe("acme");
    expect(toChartCell(true, "BOOL")).toBe(true);
  });
});

describe("toChartRow", () => {
  it("maps a keyed row to a positional cell array in column order", () => {
    const columns: ResultColumn[] = [
      { name: "month", type: "DATE" },
      { name: "visits", type: "INT64" },
    ];
    const row = { visits: "10", month: "2025-01-01" };
    expect(toChartRow(row, columns)).toEqual(["2025-01-01", 10]);
  });
});
