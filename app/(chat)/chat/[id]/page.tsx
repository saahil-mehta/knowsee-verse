import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getSession } from "@/lib/auth";
import {
  getChatById,
  getMessagesByChatId,
  getParentChat,
  getProjectById,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChatById({ id });

  if (!chat) {
    redirect("/");
  }

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  // Resolve parent chat for branch origin bar
  let parentChat: { id: string; title: string } | null = null;
  if (chat.parentChatId) {
    const parent = await getParentChat({
      parentChatId: chat.parentChatId,
    });
    if (parent) {
      parentChat = { id: parent.id, title: parent.title };
    }
  }

  // Resolve project context for back navigation
  let projectContext: { projectId: string; projectName: string } | null = null;
  if (chat.projectId) {
    const proj = await getProjectById({ id: chat.projectId });
    if (proj) {
      projectContext = { projectId: proj.id, projectName: proj.name };
    }
  }

  // Prefer the model stored on the chat; fall back to cookie then default
  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const resolvedModel =
    (chat.modelId && chatModels.some((m) => m.id === chat.modelId)
      ? chat.modelId
      : null) ??
    (chatModelFromCookie &&
    chatModels.some((m) => m.id === chatModelFromCookie.value)
      ? chatModelFromCookie.value
      : null) ??
    DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={true}
        chatTitle={chat.title}
        id={chat.id}
        initialChatModel={resolvedModel}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        parentChat={parentChat}
        projectContext={projectContext}
        projectId={chat.projectId ?? undefined}
      />
      <DataStreamHandler />
    </>
  );
}
