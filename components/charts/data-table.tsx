import type { ReactNode } from "react";
import type { CellValue, Column, Row } from "./types";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string; // CSS grid template fraction, e.g. "2fr"
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  emptyHint,
  rowKey,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyHint?: string;
  rowKey: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[13px] text-foreground/45">
        {emptyHint ?? "No matching rows."}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                className={`whitespace-nowrap border-border/60 border-b px-4 pt-1 pb-3 font-mono font-normal text-[10px] text-foreground/40 uppercase tracking-[0.18em] ${
                  c.align === "right" ? "text-right" : "text-left"
                } ${i === 0 ? "pl-0" : ""} ${i === columns.length - 1 ? "pr-0" : ""}`}
                key={c.key}
                scope="col"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey(row, i);
            return (
              <tr
                className="group/row transition-colors hover:bg-foreground/[0.025]"
                key={key}
              >
                {columns.map((c, ci) => (
                  <td
                    className={`border-border/30 border-b px-4 py-3 ${
                      c.align === "right" ? "text-right" : "text-left"
                    } ${ci === 0 ? "pl-0" : ""} ${ci === columns.length - 1 ? "pr-0" : ""}`}
                    key={c.key}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SKELETON_KEYS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
];

export function DataTableSkeleton({ rows = 8 }: { rows?: number }) {
  const count = Math.min(rows, SKELETON_KEYS.length);
  return (
    <div className="space-y-2.5">
      {SKELETON_KEYS.slice(0, count).map((k) => (
        <div className="flex items-center gap-4" key={k}>
          <div className="h-3 flex-1 animate-pulse rounded-full bg-foreground/[0.06]" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-foreground/[0.05]" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-foreground/[0.05]" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-foreground/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function SectorPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-foreground/[0.03] px-2.5 py-0.5 font-medium text-[11px] text-foreground/70">
      {value}
    </span>
  );
}

// Generic DataTable wrapper for query tool output. Takes the {columns, rows}
// shape and renders a typed table with sensible defaults.
function defaultCellRender(value: CellValue): ReactNode {
  if (value == null) {
    return "–";
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono tabular-nums">
        {new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(
          value
        )}
      </span>
    );
  }
  return String(value);
}

type GenericRow = { __i: number; cells: CellValue[] };

export function GenericDataTable({
  columns,
  rows,
  emptyHint,
}: {
  columns: Column[];
  rows: Row[];
  emptyHint?: string;
}) {
  const tableColumns: DataTableColumn<GenericRow>[] = columns.map((c, ci) => ({
    key: c.name,
    label: c.name,
    align:
      c.type === "INT64" ||
      c.type === "INTEGER" ||
      c.type === "FLOAT64" ||
      c.type === "FLOAT" ||
      c.type === "NUMERIC" ||
      c.type === "BIGNUMERIC"
        ? "right"
        : "left",
    // Keep each cell on one line so wide result sets size columns to their
    // content and scroll horizontally (the wrapper is overflow-x-auto), rather
    // than compressing into the card width and wrapping every cell vertically.
    render: (row) => (
      <span className="whitespace-nowrap">
        {defaultCellRender(row.cells[ci])}
      </span>
    ),
  }));
  const tableRows: GenericRow[] = rows.map((r, i) => ({ __i: i, cells: r }));
  return (
    <DataTable<GenericRow>
      columns={tableColumns}
      emptyHint={emptyHint}
      rowKey={(r) => String(r.__i)}
      rows={tableRows}
    />
  );
}
