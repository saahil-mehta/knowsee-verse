"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import type { AuditResult, ComparisonResult } from "@/lib/ai/commerce/schemas";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import {
  BrowsingStep,
  ComparisonTable,
  ProductCard,
  PurchaseDecision,
  ReadinessScorecard,
} from "./commerce";
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
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

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
      "tool-createDocument",
      "tool-updateDocument",
      "tool-requestSuggestions",
      "tool-browse_site",
      "tool-extract_product",
      "tool-analyse_commerce",
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
          className={cn("flex flex-col", {
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
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
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
                        "wrap-break-word w-fit rounded-2xl px-3 py-2 text-right text-white":
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
                part.state !== "input-streaming"
                  ? (part.input as { query: string })?.query
                  : undefined;
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
                part.state !== "input-streaming"
                  ? (part.input as { url: string })?.url
                  : undefined;

              return <WebFetchCard key={key} state={part.state} url={url} />;
            }

            if (type === "tool-browse_site") {
              const output =
                part.state === "output-available" ? part.output : null;
              const input =
                part.state !== "input-streaming"
                  ? (part.input as { url: string; objective: string })
                  : undefined;

              if (output && "error" in output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                    key={key}
                  >
                    Failed to browse {input?.url ?? "site"}:{" "}
                    {String(output.error)}
                  </div>
                );
              }

              const data = output ?? {
                url: input?.url ?? "",
                siteName: input?.url
                  ? (() => {
                      try {
                        return new URL(input.url).hostname;
                      } catch {
                        return input.url;
                      }
                    })()
                  : "Loading...",
                description: input?.objective ?? "Browsing...",
                productsFound: 0,
              };

              return <BrowsingStep data={data} key={key} state={part.state} />;
            }

            if (type === "tool-extract_product") {
              const output =
                part.state === "output-available" ? part.output : null;

              if (output && "error" in output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                    key={key}
                  >
                    Failed to extract product data: {String(output.error)}
                  </div>
                );
              }

              if (!output) {
                return (
                  <ProductCard
                    data={{
                      name: "Loading...",
                      price: 0,
                      currency: "GBP",
                      availability: "unknown",
                      sourceUrl: "",
                      retailer: "",
                      features: [],
                    }}
                    key={key}
                    state={part.state}
                  />
                );
              }

              return <ProductCard data={output} key={key} state={part.state} />;
            }

            if (type === "tool-analyse_commerce") {
              if (part.state !== "output-available" || !part.output) {
                return (
                  <div
                    className="my-2 flex animate-pulse items-center gap-2 text-sm text-muted-foreground"
                    key={key}
                  >
                    <span>Analysing commerce data...</span>
                  </div>
                );
              }

              const output = part.output as ComparisonResult | AuditResult;

              if (output.type === "comparison") {
                const comparison = output as ComparisonResult;
                return (
                  <div key={key}>
                    <ComparisonTable data={comparison} />
                    {comparison.winner && (
                      <PurchaseDecision
                        confidence={75}
                        reasoning={
                          comparison.winner.reasoning
                            ? [comparison.winner.reasoning]
                            : []
                        }
                        recommendation={`Go with ${comparison.winner.name}`}
                        savingsEstimate={comparison.savingsEstimate}
                      />
                    )}
                  </div>
                );
              }

              if (output.type === "audit") {
                return (
                  <ReadinessScorecard data={output as AuditResult} key={key} />
                );
              }

              return null;
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
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
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
