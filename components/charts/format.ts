// Display formatters shared across chart primitives and surrounding chrome.
// Single source of truth so a value like "1.2M" reads identically across every
// tile, axis label, and tooltip.

const NO_VALUE = "–";

const NUMBER_FORMATTERS = {
  compact: new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  full: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }),
  count: new Intl.NumberFormat("en-GB"),
} as const;

export function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return NO_VALUE;
  }
  return NUMBER_FORMATTERS.compact.format(value);
}

export function formatVolumeFull(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return NO_VALUE;
  }
  return NUMBER_FORMATTERS.full.format(value);
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return NO_VALUE;
  }
  return NUMBER_FORMATTERS.count.format(Math.round(value));
}

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export function formatRefreshedAt(value: Date): string {
  return `${DATE_FORMATTER.format(value)} · ${TIME_FORMATTER.format(value)}`;
}

export function formatMonthShort(iso: string): string {
  // iso = "2025-03-01" -> "Mar '25"
  const [yyyy, mm] = iso.split("-");
  const d = new Date(Number(yyyy), Number(mm) - 1, 1);
  return d
    .toLocaleString("en-GB", { month: "short", year: "2-digit" })
    .replace(" ", " '");
}
