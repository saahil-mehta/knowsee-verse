import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { createFeedback, getChatById } from "@/lib/db/queries";
import { sendEmail } from "@/lib/email";
import { ChatSDKError } from "@/lib/errors";

const FeedbackSchema = z.object({
  kind: z.enum(["product", "answer"]),
  category: z.string().trim().max(32).optional(),
  message: z.string().trim().min(1).max(5000),
  chatId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  pageContext: z.string().trim().max(512).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const parsed = FeedbackSchema.safeParse(await request.json());

  if (!parsed.success) {
    return new ChatSDKError(
      "bad_request:api",
      "Feedback payload is invalid."
    ).toResponse();
  }

  const data = parsed.data;

  // Answer feedback must reference a chat the user owns. Drop chat references
  // that don't belong to the caller rather than trust client-supplied ids.
  let chatId = data.chatId;
  let messageId = data.messageId;
  if (chatId) {
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      chatId = undefined;
      messageId = undefined;
    }
  }

  const saved = await createFeedback({
    userId: session.user.id,
    userEmail: session.user.email,
    kind: data.kind,
    category: data.category,
    message: data.message,
    chatId,
    messageId,
    pageContext: data.pageContext,
  });

  // Audit the stored record (metadata only, never the free-text body). The row
  // is the source of truth; this trail mirrors the loud-not-silent posture.
  console.log("[feedback] stored", {
    id: saved.id,
    kind: data.kind,
    category: data.category ?? null,
    userEmail: session.user.email,
    chatId: chatId ?? null,
    messageId: messageId ?? null,
    pageContext: data.pageContext ?? null,
  });

  // Notification is best-effort: a Mailgun failure must not lose the stored
  // feedback. Log loudly (no silent failure) and report the outcome.
  let notified = false;
  const notifyTo = getConfig().email.feedbackNotifyTo;
  if (notifyTo) {
    try {
      await sendEmail({
        to: notifyTo,
        subject: `Knowsee feedback (${data.kind}${
          data.category ? `: ${data.category}` : ""
        }) from ${session.user.email}`,
        text: buildEmailBody({
          email: session.user.email,
          kind: data.kind,
          category: data.category,
          message: data.message,
          chatId,
          messageId,
          pageContext: data.pageContext,
          feedbackId: saved.id,
        }),
      });
      notified = true;
      console.log("[feedback] notified", { id: saved.id, to: notifyTo });
    } catch (error) {
      console.error("[feedback] notification failed", { id: saved.id }, error);
    }
  } else {
    console.warn("[feedback] notify skipped: FEEDBACK_NOTIFY_TO unset", {
      id: saved.id,
    });
  }

  return Response.json({ ok: true, id: saved.id, notified }, { status: 201 });
}

function buildEmailBody(input: {
  email: string;
  kind: string;
  category?: string;
  message: string;
  chatId?: string;
  messageId?: string;
  pageContext?: string;
  feedbackId: string;
}): string {
  const lines = [
    `From: ${input.email}`,
    `Kind: ${input.kind}`,
    input.category ? `Category: ${input.category}` : null,
    input.pageContext ? `Page: ${input.pageContext}` : null,
    input.chatId ? `Chat: ${input.chatId}` : null,
    input.messageId ? `Message: ${input.messageId}` : null,
    `Feedback id: ${input.feedbackId}`,
    "",
    "Message:",
    input.message,
  ];
  return lines.filter((line) => line !== null).join("\n");
}
