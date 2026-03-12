import { cookies } from "next/headers";
import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage searchParams={searchParams} />
    </Suspense>
  );
}

async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const id = generateUUID();

  let projectContext: { projectId: string; projectName: string } | null = null;
  if (projectId) {
    const session = await getSession();
    if (session?.user) {
      const proj = await getProjectById({ id: projectId });
      if (proj && proj.userId === session.user.id) {
        projectContext = { projectId: proj.id, projectName: proj.name };
      }
    }
  }

  const isValidModel =
    modelIdFromCookie &&
    chatModels.some((m) => m.id === modelIdFromCookie.value);

  if (!isValidModel) {
    return (
      <>
        <Chat
          autoResume={false}
          chatTitle=""
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
          parentChat={null}
          projectContext={projectContext}
          projectId={projectId}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={false}
        chatTitle=""
        id={id}
        initialChatModel={modelIdFromCookie.value}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        parentChat={null}
        projectContext={projectContext}
        projectId={projectId}
      />
      <DataStreamHandler />
    </>
  );
}
