import type { BigQuery } from "@google-cloud/bigquery";

export type LineageSource = "llm" | "dashboard" | "board";

export type LineageEvent = {
  id: string;
  timestamp: Date;
  source: LineageSource;
  callerId?: string;
  prompt?: string;
  templateId?: string;
  params?: unknown;
  sql: string;
  jobId?: string;
  bytesEstimated?: number;
  bytesBilled?: number;
  rowCount?: number;
  durationMs?: number;
  region?: string;
  errorType?: string;
  errorMessage?: string;
};

export interface LineageSink {
  emit(event: LineageEvent): Promise<void>;
}

export interface IdentityProvider {
  buildClient(projectId: string): Promise<BigQuery>;
  getDefaultCallerId(): string | undefined;
}

export type CostCapConfig = {
  llm: number;
  dashboard: number;
};

export type BQClientConfig = {
  project: string;
  identity: IdentityProvider;
  costCapBytes?: Partial<CostCapConfig>;
  maxBytesHardCeiling?: number;
  lineageSink?: LineageSink;
  schemaCacheTTLMs?: number;
};

export type QueryOpts = {
  sql: string;
  source: LineageSource;
  callerId?: string;
  prompt?: string;
  templateId?: string;
  params?: unknown;
  costCapOverride?: number;
  region?: string;
};

// Lean column descriptor returned alongside query results. Distinct from
// ColumnMeta below: ColumnMeta is for table introspection (carries
// descriptions and mode); this carries only what a chart primitive or
// downstream summariser needs.
export type ResultColumn = {
  name: string;
  type: string;
};

export type QueryResult = {
  rows: Record<string, unknown>[];
  columns: ResultColumn[];
  jobId: string;
  bytesBilled: number;
  bytesEstimated: number;
  rowCount: number;
  durationMs: number;
  region: string;
  lineageId: string;
};

export type ColumnMeta = {
  name: string;
  type: string;
  mode: "NULLABLE" | "REQUIRED" | "REPEATED";
  description?: string;
};

export type TableMeta = {
  ref: string;
  columns: ColumnMeta[];
  partitioning?: {
    type: "TIME" | "RANGE";
    field?: string;
  };
  location: string;
  rowCount?: number;
  lastModified?: Date;
};
