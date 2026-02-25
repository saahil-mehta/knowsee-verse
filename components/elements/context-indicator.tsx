"use client";

import { memo } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import type { ModelPricing } from "@/lib/ai/models";
import type { UsageData } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_RADIUS = 8;
const ICON_VIEWBOX = 20;
const ICON_CENTER = 10;
const ICON_STROKE_WIDTH = 2.5;

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

function formatCost(usd: number): string {
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }
  return `$${usd.toFixed(2)}`;
}

function calculateCost(usage: UsageData, pricing: ModelPricing): number {
  const inputCost =
    ((usage.inputTokens - (usage.cachedInputTokens ?? 0)) / 1_000_000) *
    pricing.inputPerMTok;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMTok;
  const cacheCost =
    ((usage.cachedInputTokens ?? 0) / 1_000_000) *
    (pricing.cacheReadPerMTok ?? pricing.inputPerMTok);
  return inputCost + outputCost + cacheCost;
}

function getUsageColour(percent: number): string {
  if (percent >= 0.85) {
    return "text-red-500";
  }
  if (percent >= 0.6) {
    return "text-amber-500";
  }
  return "text-muted-foreground";
}

function PureContextIndicator({
  maxContextTokens,
  messageCount,
  modelName,
  pricing,
  usage,
}: {
  maxContextTokens: number;
  messageCount: number;
  modelName: string;
  pricing: ModelPricing;
  usage: UsageData | null;
}) {
  if (!usage) {
    return null;
  }

  const usedTokens = usage.inputTokens + usage.outputTokens;
  const percent = Math.min(usedTokens / maxContextTokens, 1);
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const dashOffset = circumference * (1 - percent);
  const colour = getUsageColour(percent);
  const cost = calculateCost(usage, pricing);

  const displayPct = new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(percent);

  return (
    <HoverCard closeDelay={100} openDelay={0}>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-accent",
            colour
          )}
          type="button"
        >
          <svg
            aria-label="Context usage"
            height="18"
            role="img"
            viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
            width="18"
          >
            <circle
              cx={ICON_CENTER}
              cy={ICON_CENTER}
              fill="none"
              opacity="0.2"
              r={ICON_RADIUS}
              stroke="currentColor"
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <circle
              cx={ICON_CENTER}
              cy={ICON_CENTER}
              fill="none"
              opacity="0.8"
              r={ICON_RADIUS}
              stroke="currentColor"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth={ICON_STROKE_WIDTH}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              }}
            />
          </svg>
          <span className="font-mono tabular-nums">{displayPct}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 divide-y p-0" side="top" sideOffset={8}>
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{displayPct} used</span>
            <span className="font-mono text-muted-foreground">
              {formatTokens(usedTokens)} / {formatTokens(maxContextTokens)}
            </span>
          </div>
          <Progress className="h-1.5" value={percent * 100} />
        </div>

        <div className="space-y-1.5 p-3 text-xs">
          <Row label="Model" value={modelName} />
          <Row label="Messages" value={String(messageCount)} />
          <Row label="Input tokens" value={formatTokens(usage.inputTokens)} />
          <Row label="Output tokens" value={formatTokens(usage.outputTokens)} />
          {usage.reasoningTokens ? (
            <Row
              label="Reasoning"
              value={formatTokens(usage.reasoningTokens)}
            />
          ) : null}
          {usage.cachedInputTokens ? (
            <Row label="Cached" value={formatTokens(usage.cachedInputTokens)} />
          ) : null}
        </div>

        <div className="flex items-center justify-between p-3 text-xs">
          <span className="text-muted-foreground">Estimated cost</span>
          <span className="font-mono font-medium">{formatCost(cost)}</span>
        </div>

        {percent >= 0.6 ? (
          <div className="p-3 text-xs">
            {percent >= 0.85 ? (
              <p className="text-red-400">
                Context nearly full — consider starting a new chat
              </p>
            ) : (
              <p className="text-amber-400">
                Context filling up — longer conversations may lose earlier
                detail
              </p>
            )}
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export const ContextIndicator = memo(PureContextIndicator);
