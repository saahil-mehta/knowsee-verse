import { streamObject } from "ai";
import { z } from "zod";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, content, dataStream, modelId }) => {
    if (content) {
      console.log(
        `[sheet:onCreate] DIRECT — model: ${modelId}, content: ${content.length} chars`
      );
      return content;
    }

    console.log(
      `[sheet:onCreate] FALLBACK — model: ${modelId}, no content provided, using inner generation`
    );

    let draftContent = "";

    const { fullStream } = streamObject({
      model: getLanguageModel(modelId),
      system: sheetPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe("CSV data"),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: "data-sheetDelta",
      data: draftContent,
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({
    document,
    description,
    content,
    dataStream,
    modelId,
  }) => {
    if (content) {
      console.log(
        `[sheet:onUpdate] DIRECT — model: ${modelId}, content: ${content.length} chars`
      );
      return content;
    }

    console.log(
      `[sheet:onUpdate] FALLBACK — model: ${modelId}, no content provided, using inner generation`
    );

    let draftContent = "";

    const { fullStream } = streamObject({
      model: getLanguageModel(modelId),
      system: updateDocumentPrompt(document.content, "sheet"),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
