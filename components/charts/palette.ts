// Chart colour palette. Single source of truth so series colours stay
// consistent across every chart primitive. Colours are driven by the theme's
// --chart-1..5 CSS variables (see app/globals.css), so charts inherit light
// and dark theming automatically and re-skin with the brand without touching
// this file.

export const ChartPalette = {
  // Categorical palette for arbitrary series, wrapping after the fifth slot.
  categorical: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ],
} as const;

// Returns a deterministic colour for the Nth series in a chart, wrapping
// through the categorical palette when n exceeds its length.
export function paletteColour(index: number): string {
  const palette = ChartPalette.categorical;
  return palette[index % palette.length];
}
