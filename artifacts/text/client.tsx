import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DiffView } from "@/components/diffview";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { Response } from "@/components/elements/response";
import {
  ClockRewind,
  CopyIcon,
  DownloadIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { Editor } from "@/components/text-editor";
import type { Suggestion } from "@/lib/db/schema";
import { getSuggestions } from "../actions";

type TextArtifactMetadata = {
  suggestions: Suggestion[];
};

export const textArtifact = new Artifact<"text", TextArtifactMetadata>({
  kind: "text",
  description: "Useful for text content, like drafting essays and emails.",
  initialize: async ({ documentId, setMetadata }) => {
    const suggestions = await getSuggestions({ documentId });

    setMetadata({
      suggestions,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-suggestion") {
      setMetadata((metadata) => {
        return {
          suggestions: [...metadata.suggestions, streamPart.data],
        };
      });
    }

    if (streamPart.type === "data-textDelta") {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === "streaming" &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: "streaming",
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    if (status === "streaming") {
      return (
        <div className="flex flex-row px-4 py-8 md:px-10 md:py-12">
          <div className="prose dark:prose-invert relative max-w-none">
            <Response>{content}</Response>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-row px-4 py-8 md:px-10 md:py-12">
        <Editor
          content={content}
          currentVersionIndex={currentVersionIndex}
          isCurrentVersion={isCurrentVersion}
          onSaveContent={onSaveContent}
          status={status}
          suggestions={metadata ? metadata.suggestions : []}
        />

        {metadata?.suggestions && metadata.suggestions.length > 0 ? (
          <div className="h-dvh w-12 shrink-0 md:hidden" />
        ) : null}
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
    {
      icon: <DownloadIcon size={18} />,
      label: "DOCX",
      description: "Export as Word document",
      onClick: async ({ documentId }) => {
        const toastId = toast.loading("Generating DOCX...");
        try {
          const res = await fetch(
            `/api/document/export?id=${documentId}&format=docx`
          );
          if (!res.ok) {
            throw new Error("Export failed");
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download =
            res.headers
              .get("Content-Disposition")
              ?.match(/filename="(.+)"/)?.[1] ?? "document.docx";
          a.click();
          URL.revokeObjectURL(url);
          toast.success("DOCX downloaded", { id: toastId });
        } catch {
          toast.error("Failed to export DOCX", { id: toastId });
        }
      },
      isDisabled: ({ content }) => !content || content.trim().length === 0,
    },
    {
      icon: <DownloadIcon size={18} />,
      label: "PDF",
      description: "Export as PDF",
      onClick: async ({ documentId }) => {
        const toastId = toast.loading("Generating PDF...");
        try {
          const res = await fetch(
            `/api/document/export?id=${documentId}&format=pdf`
          );
          if (!res.ok) {
            throw new Error("Export failed");
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download =
            res.headers
              .get("Content-Disposition")
              ?.match(/filename="(.+)"/)?.[1] ?? "document.pdf";
          a.click();
          URL.revokeObjectURL(url);
          toast.success("PDF downloaded", { id: toastId });
        } catch {
          toast.error("Failed to export PDF", { id: toastId });
        }
      },
      isDisabled: ({ content }) => !content || content.trim().length === 0,
    },
  ],
  toolbar: [],
});
