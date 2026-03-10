import { generateText } from "ai";
import { z } from "zod";
import type { VisibilityType } from "@/components/visibility-selector";
import { summaryPrompt, titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { getSession } from "@/lib/auth";
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";

export const maxDuration = 60;

const requestSchema = z.object({
  sourceChatId: z.string().uuid(),
  branchFromMessageId: z.string().uuid().optional(),
  focusPrompt: z.string().max(500).optional(),
  selectedChatModel: z.string(),
  visibility: z.enum(["public", "private"]) as z.ZodType<VisibilityType>,
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorised", { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const {
    sourceChatId,
    branchFromMessageId,
    focusPrompt,
    selectedChatModel,
    visibility,
  } = parsed.data;

  // Validate ownership
  const sourceChat = await getChatById({ id: sourceChatId });

  if (!sourceChat) {
    return new Response("Source chat not found", { status: 404 });
  }

  if (sourceChat.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Load messages
  let dbMessages = await getMessagesByChatId({ id: sourceChatId });

  // Truncate to branch point if specified
  if (branchFromMessageId) {
    const branchMessage = dbMessages.find((m) => m.id === branchFromMessageId);

    if (branchMessage) {
      dbMessages = dbMessages.filter(
        (m) => m.createdAt <= branchMessage.createdAt
      );
    }
  }

  if (dbMessages.length === 0) {
    return new Response("No messages to summarise", { status: 400 });
  }

  // Convert to UI messages and extract text
  const uiMessages = convertToUIMessages(dbMessages);
  const conversationText = uiMessages
    .map((m) => `${m.role}: ${getTextFromMessage(m)}`)
    .filter((line) => line.trim().length > 6) // skip empty turns
    .join("\n\n");

  // Generate summary
  const { text: summary } = await generateText({
    model: getTitleModel(),
    system: summaryPrompt(focusPrompt),
    prompt: conversationText,
  });

  // Generate title for the new chat from the summary
  const { text: rawTitle } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: summary,
  });

  const title = rawTitle
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();

  // Create new chat
  const newChatId = generateUUID();
  await saveChat({
    id: newChatId,
    userId: session.user.id,
    title,
    visibility,
    parentChatId: sourceChatId,
    projectId: sourceChat.projectId ?? undefined,
    modelId: selectedChatModel,
  });

  // Save summary as first assistant message
  const now = new Date();
  const summaryMessage: DBMessage = {
    id: generateUUID(),
    chatId: newChatId,
    role: "assistant",
    parts: [{ type: "text", text: summary }],
    attachments: [],
    createdAt: now,
  };

  await saveMessages({ messages: [summaryMessage] });

  return Response.json({ newChatId, summary });
}
