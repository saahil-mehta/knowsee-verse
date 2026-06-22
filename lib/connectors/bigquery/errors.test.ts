import { describe, expect, it } from "vitest";
import {
  BQError,
  BQExecutionError,
  CostExceededError,
  DenyListError,
  RegionMismatchError,
  SchemaNotFoundError,
} from "./errors";

describe("BQ error taxonomy", () => {
  it("sets name to the subclass constructor name", () => {
    expect(new BQError("x").name).toBe("BQError");
    expect(new DenyListError("x", "DELETE").name).toBe("DenyListError");
  });

  it("DenyListError carries the offending keyword", () => {
    expect(new DenyListError("x", "DROP").keyword).toBe("DROP");
  });

  it("CostExceededError carries the byte figures", () => {
    const e = new CostExceededError("x", 5000, 1000);
    expect(e.bytesEstimated).toBe(5000);
    expect(e.costCapBytes).toBe(1000);
  });

  it("RegionMismatchError carries expected and got", () => {
    const e = new RegionMismatchError("x", "EU", "US");
    expect(e.expected).toBe("EU");
    expect(e.got).toBe("US");
  });

  it("SchemaNotFoundError carries the table ref", () => {
    expect(new SchemaNotFoundError("x", "p.d.t").tableRef).toBe("p.d.t");
  });

  it("BQExecutionError carries an optional job id", () => {
    expect(new BQExecutionError("x", "job_123").jobId).toBe("job_123");
  });

  it("every typed error is an instanceof BQError", () => {
    expect(new DenyListError("x", "y")).toBeInstanceOf(BQError);
    expect(new CostExceededError("x", 1, 2)).toBeInstanceOf(BQError);
  });
});
