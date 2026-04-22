"use client";

import { createContext, useContext } from "react";

/**
 * Signals that a component is being rendered inside the print route
 * (app/print/[documentId]/). Chart components use this to switch from
 * ResponsiveContainer (which depends on ResizeObserver + layout stability
 * and misbehaves under Next.js 16 streaming + Puppeteer) to fixed pixel
 * dimensions suited to A4 page width.
 */
const PrintModeContext = createContext(false);

export function PrintModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrintModeContext.Provider value={true}>
      {children}
    </PrintModeContext.Provider>
  );
}

export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}

// A4 content width at 96 DPI (210mm page − 32mm side margins = 178mm).
// Charts render at this width in print mode so they fit the page exactly.
// Height is sized to carry meaningful visual presence on an A4 page: at
// 500px (≈ 132mm) a chart card occupies roughly two-thirds of the page,
// leaving breathing room above and below without the sparse feeling of
// a smaller chart marooned in empty space.
export const PRINT_CHART_WIDTH = 640;
export const PRINT_CHART_HEIGHT = 500;

// Donut/pie charts need a near-square plot area. At the 640×500 rectangle
// used for bar and radar, Recharts' Pie positioning diverges from the
// SVG-viewport-relative center label, leaving the label drifting below the
// arc under Puppeteer. Rendering the donut into a square preserves the
// relationship and keeps the label inside the donut hole.
export const PRINT_DONUT_SIZE = 500;
