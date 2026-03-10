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

// Load SVG logo once at module level
let _logoBuffer: Buffer | null = null;

export function getLogoBuffer(): Buffer | null {
  if (_logoBuffer) {
    return _logoBuffer;
  }
  try {
    _logoBuffer = readFileSync(join(process.cwd(), "public", "icon.svg"));
    return _logoBuffer;
  } catch {
    return null;
  }
}

// Logo as PNG data URL for PPTX (SVG not supported by pptxgenjs)
// We embed a minimal inline version — the logo is small enough
let _logoPngPath: string | null = null;

export function getLogoPngPath(): string | null {
  if (_logoPngPath) {
    return _logoPngPath;
  }
  try {
    const path = join(process.cwd(), "public", "icon.svg");
    readFileSync(path);
    _logoPngPath = path;
    return _logoPngPath;
  } catch {
    return null;
  }
}
