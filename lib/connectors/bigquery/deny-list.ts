import { DenyListError } from "./errors";

// Read-only allow-list. A query is accepted only when every statement it
// contains begins with one of these tokens. Inverting the model (allow-list
// instead of blacklist-anywhere) eliminates false positives such as REPLACE
// used as a string function or a SELECT * REPLACE() modifier, and rejects
// novel DML/DDL forms (CALL, EXECUTE IMMEDIATE, ASSERT, etc.) without
// hand-maintaining a denylist.
const ALLOWED_LEADERS: ReadonlySet<string> = new Set([
  "SELECT",
  "WITH",
  "EXPLAIN",
]);

function stripCommentsAndStrings(sql: string): string {
  let out = sql;
  out = out.replace(/\/\*[\s\S]*?\*\//g, " ");
  out = out.replace(/--[^\n]*/g, " ");
  out = out.replace(/"""[\s\S]*?"""/g, " ");
  out = out.replace(/'''[\s\S]*?'''/g, " ");
  out = out.replace(/`[^`]*`/g, " ");
  out = out.replace(/'(?:\\.|[^'\\])*'/g, " ");
  out = out.replace(/"(?:\\.|[^"\\])*"/g, " ");
  return out;
}

export function validateSQL(sql: string): void {
  const stripped = stripCommentsAndStrings(sql);
  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (statements.length === 0) {
    throw new DenyListError(
      "Empty SQL. The connector accepts SELECT, WITH, or EXPLAIN only.",
      "EMPTY"
    );
  }
  for (const stmt of statements) {
    const match = stmt.match(/^\s*(\w+)/);
    const first = (match?.[1] ?? "").toUpperCase();
    if (!ALLOWED_LEADERS.has(first)) {
      throw new DenyListError(
        `Read-only connector. Statements must begin with SELECT, WITH, or EXPLAIN. Got "${first}".`,
        first
      );
    }
  }
}
