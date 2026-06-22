import { getSession } from "@/lib/auth";
import { getChatsSharedWithUser } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chats = await getChatsSharedWithUser({ userId: session.user.id });
  return Response.json(chats);
}
