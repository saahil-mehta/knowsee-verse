import type { BigQuery } from "@google-cloud/bigquery";

export type DryRunResult = {
  bytesEstimated: number;
  jobId?: string;
};

export async function estimateCost(
  client: BigQuery,
  sql: string,
  region: string
): Promise<DryRunResult> {
  const [job] = await client.createQueryJob({
    query: sql,
    dryRun: true,
    location: region,
  });
  const stats = job.metadata?.statistics;
  const totalBytes =
    stats?.query?.totalBytesProcessed ?? stats?.totalBytesProcessed ?? 0;
  return {
    bytesEstimated: Number(totalBytes),
    jobId: job.id ?? undefined,
  };
}
