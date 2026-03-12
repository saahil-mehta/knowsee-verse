"use client";

import { useCallback, useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import type { ModelProbeState } from "./probe-grid";
import { getChatHistoryPaginationKey } from "./sidebar-history";

export function DataStreamHandler() {
  const {
    dataStream,
    setDataStream,
    setProbeState,
    setProbeActive,
    setProbeStatusMessage,
  } = useDataStream();
  const { mutate } = useSWRConfig();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  const handleProbeResult = useCallback(
    (data: {
      modelId: string;
      modelLabel: string;
      promptText: string;
      response: string;
      index: number;
      total: number;
    }) => {
      setProbeState((prev) => {
        const next = new Map(prev);
        const existing: ModelProbeState = next.get(data.modelId) ?? {
          modelId: data.modelId,
          modelLabel: data.modelLabel,
          completed: 0,
          total: data.total,
          responses: [],
        };

        if (data.promptText) {
          next.set(data.modelId, {
            ...existing,
            completed: data.index,
            total: data.total,
            responses: [
              ...existing.responses,
              { promptText: data.promptText, response: data.response },
            ],
          });
        } else {
          next.set(data.modelId, { ...existing, total: data.total });
        }

        return next;
      });
    },
    [setProbeState]
  );

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }

      if (delta.type === "data-research-step") {
        const msg = delta.data as string;
        setProbeStatusMessage(msg);
        if (msg.includes("Generating probe prompts")) {
          setProbeActive(true);
          setProbeState(new Map());
        } else if (msg.includes("Compiling results")) {
          setProbeActive(false);
          setProbeStatusMessage("");
        }
        continue;
      }

      if (delta.type === "data-probe-result") {
        handleProbeResult(
          delta.data as {
            modelId: string;
            modelLabel: string;
            promptText: string;
            response: string;
            index: number;
            total: number;
          }
        );
        continue;
      }

      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
              isVisible: true,
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [
    dataStream,
    setArtifact,
    setMetadata,
    artifact,
    setDataStream,
    mutate,
    handleProbeResult,
    setProbeActive,
    setProbeState,
    setProbeStatusMessage,
  ]);

  return null;
}
