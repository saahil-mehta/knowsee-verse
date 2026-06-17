// Public surface for the charts module. Primitives are exported individually
// (used by domain wrappers) and via the ChartByType dispatcher (used by the
// chat-side tool card).

export { AreaChart } from "./area-chart";
export { BarChart } from "./bar-chart";
export {
  DataTable,
  type DataTableColumn,
  DataTableSkeleton,
  GenericDataTable,
  SectorPill,
} from "./data-table";
export {
  formatCount,
  formatMonthShort,
  formatRefreshedAt,
  formatVolume,
  formatVolumeFull,
} from "./format";
export { LineChart } from "./line-chart";
export {
  MetricCard,
  MetricCardFromQuery,
  MetricCardSkeleton,
} from "./metric-card";
export { ChartPalette, paletteColour } from "./palette";
export { PieChart } from "./pie-chart";
export { ChartTooltip } from "./tooltip";
export {
  CHART_TYPES,
  type ChartByTypeProps,
  type ChartType,
  type Column,
  isNumericType,
  isTemporalType,
  type Row,
} from "./types";

import { AreaChart } from "./area-chart";
import { BarChart } from "./bar-chart";
import { GenericDataTable } from "./data-table";
import { LineChart } from "./line-chart";
import { MetricCardFromQuery } from "./metric-card";
import { PieChart } from "./pie-chart";
import type { ChartByTypeProps } from "./types";

// Dispatch a {columns, rows, chartType} payload to the right primitive.
// Used by the chat tool-card renderer. Unknown chartType falls back to the
// table view so we never blank-screen on a stale payload.
export function ChartByType({
  chartType,
  columns,
  rows,
  title,
  emptyHint,
}: ChartByTypeProps) {
  switch (chartType) {
    case "metric":
      return (
        <MetricCardFromQuery
          columns={columns}
          emptyHint={emptyHint}
          rows={rows}
          title={title}
        />
      );
    case "line":
      return <LineChart columns={columns} emptyHint={emptyHint} rows={rows} />;
    case "area":
      return <AreaChart columns={columns} emptyHint={emptyHint} rows={rows} />;
    case "bar":
      return (
        <BarChart
          columns={columns}
          emptyHint={emptyHint}
          layout="horizontal"
          rows={rows}
        />
      );
    case "pie":
      return <PieChart columns={columns} emptyHint={emptyHint} rows={rows} />;
    default:
      return (
        <GenericDataTable columns={columns} emptyHint={emptyHint} rows={rows} />
      );
  }
}
