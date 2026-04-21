"use client";

import { useEffect, useState } from "react";
import { ReportRenderer } from "@/artifacts/report/renderer";

type Props = {
  content: string;
  kind: string;
};

/**
 * Client wrapper for the print route. Renders the report artifact, then
 * emits a `data-report-ready` sentinel once the DOM has had a couple of
 * animation frames to settle (charts compute their initial layout on the
 * first frame after mount). Puppeteer waits for this sentinel before
 * calling page.pdf(), so exports capture fully-rendered content.
 */
export function PrintDocument({ content, kind }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Two RAFs: first lets React commit + charts mount, second lets any
    // secondary relayout settle. Empirically enough for Recharts.
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
      {kind === "report" ? (
        <ReportRenderer content={content} status="idle" />
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {content}
        </pre>
      )}
      {ready && <div aria-hidden="true" data-report-ready />}
    </div>
  );
}
