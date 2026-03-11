import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  LineChartIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { ReportRenderer } from "./renderer";

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
  ],
  toolbar: [
    {
      icon: <LineChartIcon />,
      description: "Refine charts",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please improve the chart styling, labels, and data presentation in this report.",
            },
          ],
        });
      },
    },
    {
      icon: <PlusIcon />,
      description: "Add section",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add a new section to this report with additional analysis.",
            },
          ],
        });
      },
    },
  ],
});
