import { invalidatePlaybookCache } from "@/lib/ai/instructions/playbook-cache";
import { getSession } from "@/lib/auth";
import {
  createPlaybookSection,
  getAllPlaybookSections,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createPlaybookSectionSchema } from "./schema";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const sections = await getAllPlaybookSections();
  return Response.json(sections);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  try {
    const json = await request.json();
    const { title } = createPlaybookSectionSchema.parse(json);
    const created = await createPlaybookSection({
      title,
      userId: session.user.id,
    });
    invalidatePlaybookCache();
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Could not create playbook section."
    ).toResponse();
  }
}
