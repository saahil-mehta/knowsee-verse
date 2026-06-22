"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { getSession } from "@/lib/auth";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getChatShares,
  getMessageById,
  searchUsers,
  shareChatWithUser,
  unshareChatWithUser,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });
  return text
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

async function assertChatOwner(chatId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ChatSDKError("unauthorized:chat");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat) {
    throw new ChatSDKError("not_found:chat");
  }

  if (chat.userId !== session.user.id) {
    throw new ChatSDKError("forbidden:chat");
  }

  return { ownerId: session.user.id, chat };
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await assertChatOwner(chatId);
  await updateChatVisibilityById({ chatId, visibility });
}

export async function shareChat({
  chatId,
  targetUserId,
}: {
  chatId: string;
  targetUserId: string;
}) {
  const { ownerId } = await assertChatOwner(chatId);

  // Sharing a chat with its owner is a no-op; the owner already has access.
  if (targetUserId === ownerId) {
    return;
  }

  await shareChatWithUser({
    chatId,
    sharedWithUserId: targetUserId,
    sharedByUserId: ownerId,
  });
}

export async function unshareChat({
  chatId,
  targetUserId,
}: {
  chatId: string;
  targetUserId: string;
}) {
  await assertChatOwner(chatId);
  await unshareChatWithUser({ chatId, sharedWithUserId: targetUserId });
}

export async function listChatShares(chatId: string) {
  await assertChatOwner(chatId);
  return await getChatShares({ chatId });
}

export async function searchShareCandidates(query: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ChatSDKError("unauthorized:chat");
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return await searchUsers({ query: trimmed, excludeUserId: session.user.id });
}
