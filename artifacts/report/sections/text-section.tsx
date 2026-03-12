"use client";

import { Response } from "@/components/elements/response";
import type { TextSection } from "../types";

export function TextBlock({ title, content }: TextSection) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {title && (
        <h3 className="mb-3 text-lg font-semibold text-foreground">{title}</h3>
      )}
      <div className="prose dark:prose-invert max-w-none">
        <Response>{content}</Response>
      </div>
    </div>
  );
}
