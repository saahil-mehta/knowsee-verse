import { describe, expect, it } from "vitest";
import { validateSQL } from "./deny-list";
import { DenyListError } from "./errors";

describe("validateSQL", () => {
  it("accepts a plain SELECT", () => {
    expect(() => validateSQL("SELECT 1")).not.toThrow();
  });

  it("accepts WITH and EXPLAIN leaders, case-insensitively", () => {
    expect(() =>
      validateSQL("with t as (select 1) select * from t")
    ).not.toThrow();
    expect(() => validateSQL("EXPLAIN SELECT 1")).not.toThrow();
  });

  it.each([
    ["DELETE", "DELETE FROM t"],
    ["UPDATE", "UPDATE t SET x = 1"],
    ["INSERT", "INSERT INTO t VALUES (1)"],
    ["DROP", "DROP TABLE t"],
    ["MERGE", "MERGE t USING s ON x"],
    ["CREATE", "CREATE TABLE t (x INT64)"],
    ["TRUNCATE", "TRUNCATE TABLE t"],
    ["ALTER", "ALTER TABLE t ADD COLUMN y INT64"],
    ["GRANT", "GRANT SELECT ON t TO 'u'"],
    ["CALL", "CALL my_proc()"],
  ])("rejects %s with a DenyListError carrying the keyword", (kw, sql) => {
    expect(() => validateSQL(sql)).toThrowError(DenyListError);
    try {
      validateSQL(sql);
    } catch (e) {
      expect((e as DenyListError).keyword).toBe(kw);
    }
  });

  it("rejects empty or comment-only SQL", () => {
    expect(() => validateSQL("")).toThrowError(DenyListError);
    expect(() => validateSQL("-- just a comment")).toThrowError(DenyListError);
  });

  it("is not fooled by a forbidden keyword inside a string literal", () => {
    expect(() => validateSQL("SELECT 'DELETE FROM t' AS note")).not.toThrow();
  });

  it("is not fooled by a forbidden keyword inside a comment", () => {
    expect(() => validateSQL("SELECT 1 -- DROP TABLE t\n")).not.toThrow();
  });

  it("rejects when any statement in a multi-statement query is not allowed", () => {
    expect(() => validateSQL("SELECT 1; DELETE FROM t")).toThrowError(
      DenyListError
    );
  });
});
