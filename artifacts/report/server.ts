import { createDocumentHandler } from "@/lib/artifacts/server";
import { stripEmDashesInJson } from "@/lib/text/sanitise-report";

export const reportDocumentHandler = createDocumentHandler<"report">({
  kind: "report",
  // biome-ignore lint/suspicious/useAwait: handler interface requires Promise<string>
  onCreateDocument: async ({ content, modelId }) => {
    console.log(
      `[report:onCreate] DIRECT -- model: ${modelId}, content: ${content ? `${content.length} chars` : "none"}`
    );
    if (content) {
      return stripEmDashesInJson(content);
    }
    return "";
  },
  // biome-ignore lint/suspicious/useAwait: handler interface requires Promise<string>
  onUpdateDocument: async ({ content, modelId }) => {
    console.log(
      `[report:onUpdate] DIRECT -- model: ${modelId}, content: ${content ? `${content.length} chars` : "none"}`
    );
    if (content) {
      return stripEmDashesInJson(content);
    }
    return "";
  },
});
