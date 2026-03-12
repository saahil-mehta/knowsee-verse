import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Knowsee brand constants — shared across all document export formats
// ---------------------------------------------------------------------------

export const BRAND = {
  purple: "#6214d9",
  darkGrey: "#1a1a1a",
  lightGrey: "#f5f5f5",
  white: "#ffffff",

  headingFont: "Arial",
  bodyFont: "Georgia",
  monoFont: "Courier New",

  pageSize: {
    width: 595.28, // A4 in points
    height: 841.89,
  },

  margin: {
    top: 72, // 1 inch
    bottom: 72,
    left: 72,
    right: 72,
  },
} as const;

// Wordmark PNG logo — cached at module level, shared by PDF and DOCX exporters
let _logoPng: Buffer | null = null;

export function getLogoPng(): Buffer | null {
  if (_logoPng) {
    return _logoPng;
  }
  try {
    _logoPng = readFileSync(
      join(process.cwd(), "public", "knowsee-logo-light.png")
    );
    return _logoPng;
  } catch {
    return null;
  }
}
