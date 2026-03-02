"use client";

import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VisibilityType } from "./visibility-selector";

export function BranchChatCard({
  chatId,
  chatTitle,
  messageId,
  selectedChatModel,
  visibility,
  onClose,
}: {
  chatId: string;
  chatTitle: string;
  messageId?: string;
  selectedChatModel: string;
  visibility: VisibilityType;
  onClose: () => void;
}) {
  const router = useRouter();
  const [focusPrompt, setFocusPrompt] = useState(chatTitle);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleBranch = async () => {
    setStatus("loading");

    try {
      const response = await fetch("/api/chat/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChatId: chatId,
          branchFromMessageId: messageId,
          focusPrompt: focusPrompt.trim() || undefined,
          selectedChatModel,
          visibility,
        }),
      });

      if (!response.ok) {
        throw new Error("Branch failed");
      }

      const { newChatId } = await response.json();
      router.push(`/chat/${newChatId}`);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fade-in mt-2 animate-in rounded-lg border border-border/60 bg-muted/30 p-3 duration-200">
      <p className="mb-2 text-muted-foreground text-sm">
        Summarise and continue in a new chat
      </p>

      <input
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-muted-foreground/40"
        disabled={status === "loading"}
        onChange={(e) => setFocusPrompt(e.target.value)}
        placeholder="Focus on..."
        type="text"
        value={focusPrompt}
      />

      {status === "error" && (
        <p className="mb-2 text-red-500 text-sm">
          Failed to generate summary. Try again.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={status === "loading"}
          onClick={handleBranch}
          type="button"
        >
          {status === "loading" && (
            <LoaderIcon className="size-3.5 animate-spin" />
          )}
          {status === "loading" ? "Summarising..." : "Continue"}
        </button>
        <button
          className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-accent"
          disabled={status === "loading"}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
