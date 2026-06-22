"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ACCENT = "#6214d9";
const MAX_LENGTH = 5000;

export type FeedbackContext = {
  kind: "product" | "answer";
  chatId?: string;
  messageId?: string;
  pageContext?: string;
};

export function FeedbackForm({
  categories,
  placeholder,
  submitLabel = "Send feedback",
  context,
  onDone,
}: {
  categories: readonly string[];
  placeholder: string;
  submitLabel?: string;
  context: FeedbackContext;
  onDone: () => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Add a few words first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...context,
          category: category ?? undefined,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      // Hold on a satisfying confirmation before the dialog closes.
      setDone(true);
      window.setTimeout(onDone, 1100);
    } catch {
      toast.error("Couldn't send that. Try again in a moment.");
      setSubmitting(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  if (done) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
        initial={{ opacity: 0 }}
      >
        <motion.div
          animate={{ scale: 1 }}
          className="flex size-12 items-center justify-center rounded-full"
          initial={{ scale: 0 }}
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          <Check className="size-6" strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="font-medium text-foreground">Thanks, that's landed.</p>
          <p className="mt-0.5 text-foreground/55 text-sm">
            The team reads every note.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((option) => {
          const active = category === option;
          return (
            <motion.button
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                active
                  ? "border-transparent text-white"
                  : "border-border text-foreground/70 hover:bg-foreground/[0.04]"
              )}
              key={option}
              onClick={() => setCategory(active ? null : option)}
              style={active ? { backgroundColor: ACCENT } : undefined}
              type="button"
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    animate={{ width: "auto", opacity: 1 }}
                    className="flex items-center overflow-hidden"
                    exit={{ width: 0, opacity: 0 }}
                    initial={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </motion.span>
                )}
              </AnimatePresence>
              {option}
            </motion.button>
          );
        })}
      </div>

      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 3px rgba(98, 20, 217, 0.14), 0 0 24px rgba(98, 20, 217, 0.12)"
            : "0 0 0 0 rgba(98, 20, 217, 0)",
        }}
        className="rounded-md"
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Textarea
          autoFocus
          className={cn(
            "resize-none transition-colors duration-200 focus-visible:ring-0 focus-visible:ring-offset-0",
            focused && "border-[#6214d9]/55"
          )}
          maxLength={MAX_LENGTH}
          onBlur={() => setFocused(false)}
          onChange={(event) => setMessage(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={5}
          value={message}
        />
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-foreground/40">
          {"⌘"}/Ctrl + Enter to send
        </span>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {message.length > 0 && (
              <motion.span
                animate={{ opacity: 1 }}
                className={cn(
                  "text-[11px] tabular-nums",
                  message.length > MAX_LENGTH * 0.9
                    ? "text-amber-600"
                    : "text-foreground/35"
                )}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                {message.length}/{MAX_LENGTH}
              </motion.span>
            )}
          </AnimatePresence>
          <Button disabled={submitting} onClick={submit} type="button">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
