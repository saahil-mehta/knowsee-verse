"use client";

import { AnimatePresence, motion } from "framer-motion";

type ProbeResponse = {
  promptText: string;
  response: string;
};

export type ModelProbeState = {
  modelId: string;
  modelLabel: string;
  completed: number;
  total: number;
  responses: ProbeResponse[];
};

type ProbeGridProps = {
  models: ModelProbeState[];
  isActive: boolean;
  statusMessage: string;
};

export function ProbeGrid({ models, isActive, statusMessage }: ProbeGridProps) {
  if (models.length === 0) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="my-4 w-full space-y-3"
      initial={{ opacity: 0, y: 8 }}
    >
      {isActive && statusMessage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
              .
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              .
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "300ms" }}
            >
              .
            </span>
          </span>
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {models.map((model) => (
          <ModelCard key={model.modelId} model={model} />
        ))}
      </div>
    </motion.div>
  );
}

function ModelCard({ model }: { model: ModelProbeState }) {
  const isDone = model.completed === model.total && model.total > 0;
  const isActive = model.completed > 0 && !isDone;

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{model.modelLabel}</span>
        <span className="text-xs text-muted-foreground">
          {model.total === 0
            ? "Waiting..."
            : isDone
              ? "Done"
              : `${model.completed}/${model.total}`}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isDone ? "bg-green-500" : isActive ? "bg-amber-500" : "bg-muted"
          }`}
          style={{
            width:
              model.total > 0
                ? `${(model.completed / model.total) * 100}%`
                : "0%",
          }}
        />
      </div>

      <div className="h-32 space-y-1.5 overflow-y-auto text-xs">
        <AnimatePresence>
          {model.responses.map((r) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="rounded bg-muted/50 p-2"
              initial={{ opacity: 0, x: -4 }}
              key={`${model.modelId}-${r.promptText}`}
            >
              <div className="truncate font-medium text-muted-foreground">
                {r.promptText}
              </div>
              <div className="mt-0.5 line-clamp-2 text-foreground/80">
                {r.response}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
