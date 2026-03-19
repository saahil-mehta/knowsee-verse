import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { Session } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
  chatId: string;
};

export const createDocument = ({
  session,
  dataStream,
  modelId,
  chatId,
}: CreateDocumentProps) => {
  let createdDocumentId: string | null = null;

  return tool({
    description:
      "Create a new document artifact. CRITICAL CONSTRAINT: You may only call this tool ONCE per response — a second call will fail. If a document already exists in this conversation, you MUST use updateDocument instead. Never call createDocument twice.",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
      content: z
        .string()
        .optional()
        .describe(
          "The full document content. For text: markdown. For code: complete runnable code. For sheet: CSV with headers. For report: valid JSON with { title, subtitle?, date?, sections[] } — use exact field names from the report schema in the system prompt."
        ),
    }),
    execute: async ({ title, kind, content }) => {
      if (createdDocumentId) {
        console.warn(
          `[createDocument] DUPLICATE BLOCKED: already created ${createdDocumentId}, rejecting "${title}"`
        );
        return {
          error: `A document was already created in this response (id: ${createdDocumentId}). Use updateDocument with this ID to modify it.`,
        };
      }

      const id = generateUUID();
      createdDocumentId = id;

      console.log(
        `[createDocument] Creating "${title}" (id: ${id}, kind: ${kind}, model: ${modelId}, content: ${content ? `provided (${content.length} chars)` : "none — will use inner generation"})`
      );

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      // Only emit data-clear for the fallback (inner generation) path.
      // When content is provided directly, ToolStreamHandler already
      // streamed the content to the artifact panel during input-streaming.
      if (!content) {
        dataStream.write({
          type: "data-clear",
          data: null,
          transient: true,
        });
      }

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        content,
        dataStream,
        session,
        modelId,
        chatId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: `Document created successfully (id: ${id}). The document is now visible to the user. On future turns, use updateDocument with this ID to modify it — do NOT create a new document.`,
      };
    },
  });
};
