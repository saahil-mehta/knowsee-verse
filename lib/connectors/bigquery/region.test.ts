import { describe, expect, it } from "vitest";
import { detectRegionForQuery, extractFirstTableRef } from "./region";

describe("extractFirstTableRef", () => {
  it("parses a fully-qualified backticked reference", () => {
    expect(
      extractFirstTableRef(
        "SELECT * FROM `bigquery-public-data.samples.shakespeare`"
      )
    ).toEqual({
      project: "bigquery-public-data",
      dataset: "samples",
      table: "shakespeare",
    });
  });

  it("returns null when there is no backticked reference", () => {
    expect(extractFirstTableRef("SELECT 1")).toBeNull();
  });
});

describe("detectRegionForQuery", () => {
  it("returns the hint without invoking the detector when given one", async () => {
    let called = false;
    const detector = () => {
      called = true;
      return Promise.resolve("US");
    };
    await expect(
      detectRegionForQuery(detector, "SELECT 1", "EU")
    ).resolves.toBe("EU");
    expect(called).toBe(false);
  });

  it("detects via the first table ref when no hint is given", async () => {
    const detector = (project: string, dataset: string) =>
      Promise.resolve(`${project}:${dataset}`);
    await expect(
      detectRegionForQuery(detector, "SELECT * FROM `p.d.t`")
    ).resolves.toBe("p:d");
  });

  it("rejects when no region can be inferred", async () => {
    const detector = () => Promise.resolve("US");
    await expect(detectRegionForQuery(detector, "SELECT 1")).rejects.toThrow(
      /Could not infer region/
    );
  });
});
