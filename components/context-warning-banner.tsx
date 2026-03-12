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
        "absolute inset-x-0 bottom-full z-0 animate-in slide-in-from-bottom-2 fade-in duration-300",
        "translate-y-3"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between rounded-t-2xl border border-b-0 px-4 pb-5 pt-2.5 text-sm",
          isRed
            ? "border-red-800/50 bg-neutral-950 text-red-400"
            : "border-amber-800/50 bg-neutral-950 text-amber-400"
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
    </div>
  );
}
