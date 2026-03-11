"use client";

import { useEffect, useRef } from "react";
import type { ArtifactKind } from "@/components/artifact";
import { useArtifact } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/types";

const VISIBILITY_THRESHOLD = 200;

export function ToolStreamHandler({ messages }: { messages: ChatMessage[] }) {
  const { setArtifact } = useArtifact();
  const prevContentRef = useRef<string>("");

  useEffect(() => {
    const lastMessage = messages.at(-1);

    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    // Find the latest actively streaming createDocument or updateDocument tool call
    let streamingToolType: string | null = null;
    let streamingInput: Record<string, unknown> | null = null;

    for (const part of lastMessage.parts) {
      if (
        (part.type === "tool-createDocument" ||
          part.type === "tool-updateDocument") &&
        "state" in part &&
        part.state === "input-streaming" &&
        "input" in part &&
        part.input
      ) {
        streamingToolType = part.type;
        streamingInput = part.input as Record<string, unknown>;
      }
    }

    if (!streamingInput) {
      // No active streaming — reset ref for next time
      if (prevContentRef.current) {
        prevContentRef.current = "";
      }
      return;
    }

    const content = streamingInput.content as string | undefined;

    if (!content || content === prevContentRef.current) {
      return;
    }

    prevContentRef.current = content;

    const title = (streamingInput.title as string) ?? "";
    const kind =
      streamingToolType === "tool-createDocument"
        ? ((streamingInput.kind as string) ?? "text")
        : undefined;

    setArtifact((current) => ({
      ...current,
      ...(title && { title }),
      ...(kind && { kind: kind as ArtifactKind }),
      content,
      status: "streaming",
      isVisible: content.length >= VISIBILITY_THRESHOLD || current.isVisible,
    }));
  }, [messages, setArtifact]);

  return null;
}
