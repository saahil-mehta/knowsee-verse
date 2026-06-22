// Typed error taxonomy for the BigQuery connector. Each class carries the
// fields the UI needs to render a recovery-focused message (see the chart
// card's error variant). The connector raises these instead of leaking raw
// BigQuery errors, so callers branch on a stable, named set.

export class BQError extends Error {
  override readonly name: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class AuthError extends BQError {}

export class DenyListError extends BQError {
  readonly keyword: string;

  constructor(message: string, keyword: string, options?: ErrorOptions) {
    super(message, options);
    this.keyword = keyword;
  }
}

export class CostExceededError extends BQError {
  readonly bytesEstimated: number;
  readonly costCapBytes: number;

  constructor(
    message: string,
    bytesEstimated: number,
    costCapBytes: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.bytesEstimated = bytesEstimated;
    this.costCapBytes = costCapBytes;
  }
}

export class RegionMismatchError extends BQError {
  readonly expected: string;
  readonly got: string;

  constructor(
    message: string,
    expected: string,
    got: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.expected = expected;
    this.got = got;
  }
}

export class SchemaNotFoundError extends BQError {
  readonly tableRef: string;

  constructor(message: string, tableRef: string, options?: ErrorOptions) {
    super(message, options);
    this.tableRef = tableRef;
  }
}

export class BQExecutionError extends BQError {
  readonly jobId?: string;

  constructor(message: string, jobId?: string, options?: ErrorOptions) {
    super(message, options);
    this.jobId = jobId;
  }
}
