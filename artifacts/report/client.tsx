import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  DownloadIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { ReportRenderer } from "./renderer";

async function downloadReport(
  documentId: string,
  format: "pdf" | "html",
  filename: string
): Promise<void> {
  const response = await fetch(
    `/api/document/export-report?id=${encodeURIComponent(documentId)}&format=${format}`,
    { method: "GET" }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export const reportArtifact = new Artifact<"report">({
  kind: "report",
  description:
    "Useful for creating interactive reports with charts, KPIs, and data visualisations.",
  onStreamPart: () => {
    // No-op: report content is delivered via the direct path
  },
  content: ({ status, content, isLoading }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="report" />;
    }

    return <ReportRenderer content={content} status={status} />;
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy raw JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
    {
      icon: <DownloadIcon size={18} />,
      label: "HTML",
      description: "Download as HTML",
      onClick: async ({ content, documentId }) => {
        const toastId = toast.loading("Generating HTML...");
        try {
          const title = JSON.parse(content).title ?? "Report";
          await downloadReport(documentId, "html", title);
          toast.success("HTML downloaded", { id: toastId });
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to export HTML",
            { id: toastId }
          );
        }
      },
      isDisabled: ({ content }) => !content || content.trim().length === 0,
    },
    {
      icon: <DownloadIcon size={18} />,
      label: "PDF",
      description: "Download as PDF",
      onClick: async ({ content, documentId }) => {
        const toastId = toast.loading("Generating PDF...");
        try {
          const title = JSON.parse(content).title ?? "Report";
          await downloadReport(documentId, "pdf", title);
          toast.success("PDF downloaded", { id: toastId });
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to export PDF",
            { id: toastId }
          );
        }
      },
      isDisabled: ({ content }) => !content || content.trim().length === 0,
    },
  ],
  toolbar: [],
});
