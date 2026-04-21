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
export const PRINT_CHART_WIDTH = 640;
export const PRINT_CHART_HEIGHT = 320;
