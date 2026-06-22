import type { BigQuery } from "@google-cloud/bigquery";
import { BQError, RegionMismatchError } from "./errors";

export type TableRef = {
  project: string;
  dataset: string;
  table: string;
};

export type RegionDetector = (
  projectId: string,
  datasetId: string
) => Promise<string>;

const TABLE_REF_PATTERN = /`([\w-]+)\.(\w+)\.(\w+)`/;

export function extractFirstTableRef(sql: string): TableRef | null {
  const match = TABLE_REF_PATTERN.exec(sql);
  if (!match) {
    return null;
  }
  return { project: match[1], dataset: match[2], table: match[3] };
}

export function createRegionDetector(client: BigQuery): RegionDetector {
  const cache = new Map<string, string>();
  return async (projectId, datasetId) => {
    const key = `${projectId}.${datasetId}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const dataset = client.dataset(datasetId, { projectId });
    const [metadata] = await dataset.getMetadata();
    const location = metadata?.location;
    if (!location || typeof location !== "string") {
      throw new RegionMismatchError(
        `Could not detect region for ${key}`,
        "any",
        "unknown"
      );
    }
    cache.set(key, location);
    return location;
  };
}

export function detectRegionForQuery(
  detector: RegionDetector,
  sql: string,
  hint?: string
): Promise<string> {
  if (hint) {
    return Promise.resolve(hint);
  }
  const ref = extractFirstTableRef(sql);
  if (!ref) {
    return Promise.reject(
      new BQError(
        "Could not infer region: no fully-qualified backticked table reference in SQL. Pass region explicitly in QueryOpts."
      )
    );
  }
  return detector(ref.project, ref.dataset);
}
