import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import type { Session } from "@/lib/auth";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

export const updateDocument = ({
  session,
  dataStream,
  modelId,
}: UpdateDocumentProps) =>
  tool({
    description:
      "Update an existing document. Use this instead of createDocument when a document already exists in the conversation. Find the document ID from a previous createDocument or updateDocument result in the message history.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
      content: z
        .string()
        .optional()
        .describe(
          "The full updated document content. For text: markdown. For code: complete runnable code. For sheet: CSV with headers."
        ),
    }),
    execute: async ({ id, description, content }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      // Only emit data-clear for the fallback (inner generation) path.
      // When content is provided directly, ToolStreamHandler already
      // streamed the new content to the artifact panel during input-streaming.
      if (!content) {
        dataStream.write({
          type: "data-clear",
          data: null,
          transient: true,
        });
      }

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        content,
        dataStream,
        session,
        modelId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
