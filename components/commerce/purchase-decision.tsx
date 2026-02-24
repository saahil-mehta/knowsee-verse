"use client";

import { CheckCircle2Icon, SparklesIcon, TrendingDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PurchaseDecisionProps = {
  recommendation: string;
  reasoning: string[];
  confidence: number;
  alternativeNote?: string;
  savingsEstimate?: string;
  className?: string;
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const label = confidence >= 80 ? "High" : confidence >= 50 ? "Medium" : "Low";
  const colour =
    confidence >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
      : confidence >= 50
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400";

  return (
    <span
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colour)}
    >
      {label} confidence ({confidence}%)
    </span>
  );
}

export function PurchaseDecision({
  recommendation,
  reasoning,
  confidence,
  alternativeNote,
  savingsEstimate,
  className,
}: PurchaseDecisionProps) {
  return (
    <div
      className={cn(
        "not-prose my-3 rounded-lg border border-border/50 bg-muted/20 p-5",
        className
      )}
    >
      {/* Headline */}
      <div className="flex items-start gap-3">
        <SparklesIcon className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {recommendation}
          </h3>
          <div className="mt-2">
            <ConfidenceBadge confidence={confidence} />
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {reasoning.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reasoning.map((point) => (
            <li className="flex items-start gap-2 text-sm" key={point}>
              <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-green-500" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Savings callout */}
      {savingsEstimate && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-green-50/50 px-3 py-2 dark:bg-green-950/20">
          <TrendingDownIcon className="size-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-800 dark:text-green-400">
            Estimated savings: {savingsEstimate}
          </span>
        </div>
      )}

      {/* Alternative note */}
      {alternativeNote && (
        <p className="mt-3 text-xs text-muted-foreground">{alternativeNote}</p>
      )}
    </div>
  );
}
