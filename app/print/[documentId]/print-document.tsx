"use client";

import { useEffect, useState } from "react";
import { ReportRenderer } from "@/artifacts/report/renderer";
import { PrintModeProvider } from "@/lib/print-mode";

type Props = {
  content: string;
  kind: string;
};

/**
 * Client wrapper for the print route. Wraps the report renderer in
 * PrintModeProvider so chart components know to use fixed pixel
 * dimensions instead of ResponsiveContainer. Emits a `data-report-ready`
 * sentinel once hydration is complete so Puppeteer knows when to capture.
 */
export function PrintDocument({ content, kind }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Two RAFs: first lets React commit, second lets charts mount and
    // render. With fixed pixel dimensions (via PrintModeProvider) charts
    // don't depend on ResizeObserver timing, so this simple delay is
    // sufficient.
    let frame2: number;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      if (frame2) {
        cancelAnimationFrame(frame2);
      }
    };
  }, []);

  return (
    <div className="knowsee-print-root">
      <PrintModeProvider>
        {kind === "report" ? (
          <ReportRenderer content={content} status="idle" />
        ) : (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {content}
          </pre>
        )}
      </PrintModeProvider>
      {ready && <div aria-hidden="true" data-report-ready />}
    </div>
  );
}
