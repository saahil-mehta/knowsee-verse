import { getSession } from "@/lib/auth";
import {
  deleteProjectById,
  getProjectWithBrandProfile,
  updateProject,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updateProjectSchema } from "../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:project").toResponse();
  }

  const result = await getProjectWithBrandProfile({ projectId: id });

  if (!result) {
    return new ChatSDKError("not_found:project").toResponse();
  }

  if (result.project.userId !== session.user.id) {
    return new ChatSDKError("forbidden:project").toResponse();
  }

  return Response.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:project").toResponse();
  }

  const result = await getProjectWithBrandProfile({ projectId: id });

  if (!result) {
    return new ChatSDKError("not_found:project").toResponse();
  }

  if (result.project.userId !== session.user.id) {
    return new ChatSDKError("forbidden:project").toResponse();
  }

  try {
    const json = await request.json();
    const { name } = updateProjectSchema.parse(json);
    const updated = await updateProject({ id, name });
    return Response.json(updated);
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:project").toResponse();
  }

  const result = await getProjectWithBrandProfile({ projectId: id });

  if (!result) {
    return new ChatSDKError("not_found:project").toResponse();
  }

  if (result.project.userId !== session.user.id) {
    return new ChatSDKError("forbidden:project").toResponse();
  }

  await deleteProjectById({ id });
  return Response.json({ success: true }, { status: 200 });
}
