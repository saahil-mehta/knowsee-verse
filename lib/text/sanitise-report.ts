// ---------------------------------------------------------------------------
// Report text sanitisation.
//
// The em-dash (U+2014) is the single most "obviously AI" punctuation tell in
// model output. Prompt-level bans help but do not hold; the model slips under
// pressure. These helpers strip em-dashes deterministically on the write path
// so downstream render and export surfaces can never display one, regardless
// of what the model emits.
//
// En-dashes (U+2013) are preserved because they are correct punctuation for
// numeric and date ranges (e.g. "£3–5bn", "2023–2026"). Only the em-dash is
// targeted.
// ---------------------------------------------------------------------------

/**
 * Replace every em-dash in a plain-text string with conventional punctuation.
 *
 * Strategy:
 *   "A — B"   → "A, B"   (spaced parenthetical separator — the common case)
 *   "A—B"    → "A, B"    (tight em-dash — also parenthetical)
 *
 * A final cleanup collapses any double-commas or stray space-before-comma
 * artefacts introduced by the replacements above.
 */
export function stripEmDashes(text: string): string {
  if (!text?.includes("—")) {
    return text;
  }
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}

/**
 * Deep-sanitise every string value inside a JSON payload (stringified).
 *
 * Used by the report document handler where `content` is a stringified
 * ReportData blob whose string fields (title, subtitle, section titles,
 * descriptions, prose content, recommendation action/reason/impact, chart
 * labels, table cells) may each contain em-dashes. Walks arbitrary nesting
 * without needing to know the schema.
 *
 * If the input is not valid JSON (mid-stream chunk, plain-text fallback),
 * falls through to treating it as plain text.
 */
export function stripEmDashesInJson(jsonString: string): string {
  if (!jsonString?.includes("—")) {
    return jsonString;
  }
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(sanitiseDeep(parsed));
  } catch {
    return stripEmDashes(jsonString);
  }
}

function sanitiseDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return stripEmDashes(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitiseDeep);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitiseDeep(v);
    }
    return out;
  }
  return value;
}
