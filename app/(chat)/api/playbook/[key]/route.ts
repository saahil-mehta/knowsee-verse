import { invalidatePlaybookCache } from "@/lib/ai/instructions/playbook-cache";
import { getSession } from "@/lib/auth";
import { deletePlaybookSection, updatePlaybookSection } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updatePlaybookSectionSchema } from "../schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const { key } = await params;

  try {
    const json = await request.json();
    const { title, body } = updatePlaybookSectionSchema.parse(json);
    const updated = await updatePlaybookSection({
      key,
      title,
      body,
      userId: session.user.id,
    });
    invalidatePlaybookCache();
    return Response.json(updated);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Could not update playbook section."
    ).toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const { key } = await params;

  try {
    await deletePlaybookSection({ key });
    invalidatePlaybookCache();
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Could not delete playbook section."
    ).toResponse();
  }
}
