"use client";

import { motion } from "framer-motion";
import {
  ChevronDownIcon,
  ClipboardCheckIcon,
  LightbulbIcon,
} from "lucide-react";
import { useState } from "react";
import type { AuditResult } from "@/lib/ai/commerce/schemas";
import { cn } from "@/lib/utils";

export type ReadinessScorecardProps = {
  data: AuditResult;
  className?: string;
};

// ---------------------------------------------------------------------------
// Animated circular gauge (SVG ring)
// ---------------------------------------------------------------------------

function CircularGauge({
  score,
  size = 120,
  strokeWidth = 8,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colour =
    score >= 70
      ? "stroke-green-500"
      : score >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" height={size} width={size}>
        {/* Background ring */}
        <circle
          className="stroke-muted"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Score ring */}
        <motion.circle
          animate={{ strokeDashoffset: offset }}
          className={colour}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          animate={{ opacity: 1 }}
          className="text-2xl font-bold tabular-nums text-foreground"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline mini gauge for categories
// ---------------------------------------------------------------------------

function InlineGauge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const colour =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          animate={{ width: `${score}%` }}
          className={cn("h-full rounded-full", colour)}
          initial={{ width: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category card with expandable findings
// ---------------------------------------------------------------------------

function CategoryCard({
  name,
  score,
  findings,
}: {
  name: string;
  score: number;
  findings: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border/30 p-3">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="flex-1 text-sm font-medium text-foreground">
          {name}
        </span>
        <InlineGauge className="w-24" score={score} />
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && findings.length > 0 && (
        <ul className="mt-2 space-y-1 pl-1">
          {findings.map((finding) => (
            <li
              className="flex items-start gap-2 text-xs text-muted-foreground"
              key={finding}
            >
              <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
              {finding}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main scorecard
// ---------------------------------------------------------------------------

export function ReadinessScorecard({
  data,
  className,
}: ReadinessScorecardProps) {
  return (
    <div
      className={cn(
        "not-prose my-3 rounded-lg border border-border/50 bg-muted/20 p-5",
        className
      )}
    >
      {/* Header with overall gauge */}
      <div className="flex items-start gap-5">
        <CircularGauge score={data.overallScore} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ClipboardCheckIcon className="size-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">
              Commerce Readiness
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Overall score based on {data.categories.length} assessment
            {data.categories.length !== 1 ? " categories" : " category"}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="mt-5 space-y-2">
        {data.categories.map((category) => (
          <CategoryCard
            findings={category.findings}
            key={category.name}
            name={category.name}
            score={category.score}
          />
        ))}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <LightbulbIcon className="size-4 text-amber-500" />
            <h4 className="text-sm font-medium text-foreground">
              Recommendations
            </h4>
          </div>
          <ul className="space-y-1.5 pl-1">
            {data.recommendations.map((rec) => (
              <li
                className="flex items-start gap-2 text-sm text-muted-foreground"
                key={rec}
              >
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
