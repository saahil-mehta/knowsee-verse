"use client";

import { cn } from "@/lib/utils";
import { BranchIcon } from "./icons";

export function ContextWarningBanner({
  percent,
  onBranch,
}: {
  percent: number;
  onBranch: () => void;
}) {
  if (percent < 0.7) {
    return null;
  }

  const isRed = percent >= 1;
  const displayPct = Math.round(percent * 100);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border p-3 text-sm transition-colors",
        isRed
          ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
          : "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
      )}
    >
      <span>
        Context <span className="font-medium">{displayPct}%</span> full
      </span>
      <button
        className="inline-flex items-center gap-1.5 font-medium transition-opacity hover:opacity-80"
        onClick={onBranch}
        type="button"
      >
        <BranchIcon size={14} />
        Summarise and continue
      </button>
    </div>
  );
}
