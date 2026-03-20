"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "./ai-elements/chain-of-thought";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import {
  WebFetchCard,
  WebSearchCard,
  WebSearchHeader,
  type WebSearchOutput,
  WebSearchResult,
  WebSearchResults,
} from "./elements/web-search";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { type ModelProbeState, ProbeGrid } from "./probe-grid";
import type { VisibilityType } from "./visibility-selector";

const PurePreviewMessage = ({
  addToolApprovalResponse: _addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  chatTitle,
  canBranch,
  selectedChatModel,
  visibility,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  chatTitle: string;
  canBranch: boolean;
  selectedChatModel: string;
  visibility: VisibilityType;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  const { probeState, probeActive, probeStatusMessage } = useDataStream();

  const { processedParts, hasVisibleContent } = useMemo(() => {
    const processed: typeof message.parts = [];

    for (const part of message.parts) {
      if (part.type === "source-url") {
        continue;
      }

      // Merge adjacent text parts into one (fixes line-break gaps from source interleaving)
      const lastIdx = processed.length - 1;
      const prev = processed.at(-1);
      if (part.type === "text" && prev?.type === "text") {
        processed[lastIdx] = { ...prev, text: prev.text + part.text };
        continue;
      }

      processed.push(part);
    }

    const renderedToolTypes = new Set([
      "tool-brand_audit",
      "tool-brand_perception",
      "tool-createDocument",
      "tool-updateDocument",
      "tool-requestSuggestions",
    ]);

    const hasVisibleContent = processed.some((part) => {
      if (part.type === "text") {
        return !!part.text?.trim();
      }
      if (part.type === "reasoning") {
        return (
          (part.text?.trim().length ?? 0) > 0 ||
          ("state" in part && part.state === "streaming")
        );
      }
      return renderedToolTypes.has(part.type);
    });

    return { processedParts: processed, hasVisibleContent };
  }, [message.parts]);

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        <div
          className={cn("flex min-w-0 flex-col", {
            "gap-2 md:gap-4": processedParts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "w-full":
              (message.role === "assistant" &&
                (processedParts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                ) ||
                  processedParts?.some((p) => p.type.startsWith("tool-")))) ||
              mode === "edit",
            "max-w-full sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {processedParts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning") {
              const hasContent = part.text?.trim().length > 0;
              const isStreaming = "state" in part && part.state === "streaming";
              if (hasContent || isStreaming) {
                return (
                  <MessageReasoning
                    isLoading={isLoading || isStreaming}
                    key={key}
                    reasoning={part.text || ""}
                  />
                );
              }
            }

            if (type === "text") {
              if (mode === "view") {
                return (
                  <div key={key}>
                    <MessageContent
                      className={cn({
                        "wrap-break-word w-fit rounded-2xl px-4 py-2.5 text-white":
                          message.role === "user",
                        "bg-transparent px-0 py-0 text-left":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>{sanitizeText(part.text)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              // During input-streaming, output is not yet available
              if ("state" in part && part.state === "input-streaming") {
                const partialInput = part.input as
                  | { title?: string; kind?: string }
                  | undefined;
                return (
                  <DocumentPreview
                    args={{
                      title: partialInput?.title ?? "Generating...",
                      kind: partialInput?.kind ?? "text",
                    }}
                    isReadonly={isReadonly}
                    key={toolCallId}
                  />
                );
              }

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              // During input-streaming, output is not yet available
              if ("state" in part && part.state === "input-streaming") {
                return null;
              }

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-web_search") {
              const query =
                part.state === "input-streaming"
                  ? undefined
                  : (part.input as { query: string })?.query;
              const results =
                part.state === "output-available"
                  ? (part.output as WebSearchOutput)
                  : undefined;

              return (
                <WebSearchCard key={key}>
                  <WebSearchHeader
                    query={query}
                    resultCount={results?.length}
                    state={part.state}
                  />
                  {results && results.length > 0 && (
                    <WebSearchResults>
                      {results.map((result) => {
                        let title = result.title;
                        if (!title) {
                          try {
                            title = new URL(result.url).hostname;
                          } catch {
                            title = result.url;
                          }
                        }
                        return (
                          <WebSearchResult
                            href={result.url}
                            key={result.url}
                            title={title}
                          />
                        );
                      })}
                    </WebSearchResults>
                  )}
                </WebSearchCard>
              );
            }

            if (type === "tool-web_fetch") {
              const url =
                part.state === "input-streaming"
                  ? undefined
                  : (part.input as { url: string })?.url;

              return <WebFetchCard key={key} state={part.state} url={url} />;
            }

            if (type === "tool-brand_perception") {
              // During streaming: show live probe grid from context
              if (
                part.state === "input-streaming" ||
                part.state === "input-available"
              ) {
                const liveModels = Array.from(probeState.values());
                if (liveModels.length === 0) {
                  return (
                    <div
                      className="flex items-center gap-1 text-sm text-muted-foreground"
                      key={key}
                    >
                      <span className="animate-pulse">
                        Starting visibility audit...
                      </span>
                    </div>
                  );
                }
                return (
                  <ProbeGrid
                    isActive={probeActive}
                    key={key}
                    models={liveModels}
                    statusMessage={probeStatusMessage}
                  />
                );
              }

              // After completion: render from persisted tool output
              if (part.state === "output-available") {
                const output = part.output as {
                  probeGrid?: ModelProbeState[];
                } | null;
                if (output?.probeGrid) {
                  return (
                    <ProbeGrid
                      isActive={false}
                      key={key}
                      models={output.probeGrid}
                      statusMessage=""
                    />
                  );
                }
              }

              return null;
            }

            if (type === "tool-brand_audit") {
              if (
                part.state === "input-available" ||
                part.state === "input-streaming"
              ) {
                return (
                  <div
                    className="flex items-center gap-1 text-muted-foreground text-sm"
                    key={key}
                  >
                    <span className="animate-pulse">
                      Generating research plan...
                    </span>
                  </div>
                );
              }

              if (part.state === "output-available") {
                const output = part.output as {
                  brandName: string;
                  phases: {
                    name: string;
                    description: string;
                  }[];
                } | null;

                if (!output?.phases) {
                  return null;
                }

                return (
                  <ChainOfThought
                    className="w-full max-w-full"
                    defaultOpen={true}
                    key={key}
                  >
                    <ChainOfThoughtHeader>
                      Research: {output.brandName} Agentic Commerce Audit
                    </ChainOfThoughtHeader>
                    <ChainOfThoughtContent>
                      {output.phases.map((phase) => (
                        <ChainOfThoughtStep
                          description={phase.description}
                          key={phase.name}
                          label={phase.name}
                          status="pending"
                        />
                      ))}
                    </ChainOfThoughtContent>
                  </ChainOfThought>
                );
              }
            }

            return null;
          })}

          {isLoading && message.role === "assistant" && !hasVisibleContent && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <span className="animate-pulse">Thinking</span>
              <span className="inline-flex">
                <span className="animate-bounce [animation-delay:0ms]">.</span>
                <span className="animate-bounce [animation-delay:150ms]">
                  .
                </span>
                <span className="animate-bounce [animation-delay:300ms]">
                  .
                </span>
              </span>
            </div>
          )}

          {!isReadonly && (
            <MessageActions
              canBranch={canBranch}
              chatId={chatId}
              chatTitle={chatTitle}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              selectedChatModel={selectedChatModel}
              setMode={setMode}
              visibility={visibility}
              vote={vote}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
            <span className="animate-pulse">Thinking</span>
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
