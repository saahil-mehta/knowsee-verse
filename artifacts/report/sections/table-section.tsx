"use client";

import type { TableSection } from "../types";

export function DataTable({ title, columns, rows }: TableSection) {
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {title && (
        <h3 className="mb-3 text-lg font-semibold text-foreground">{title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  className="px-3 py-2 font-medium text-muted-foreground"
                  key={col.key}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                className="border-b border-border last:border-0"
                key={`row-${i}`}
              >
                {columns.map((col) => (
                  <td className="px-3 py-2 text-foreground" key={col.key}>
                    {String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
