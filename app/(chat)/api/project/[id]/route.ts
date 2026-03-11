import { getOwnedProjectWithProfile } from "@/lib/api/project-auth";
import { deleteProjectById, updateProject } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updateProjectSchema } from "../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProjectWithProfile(id);

  if ("error" in result) {
    return result.error;
  }

  return Response.json({
    project: result.project,
    brandProfile: result.brandProfile,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProjectWithProfile(id);

  if ("error" in result) {
    return result.error;
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
  const result = await getOwnedProjectWithProfile(id);

  if ("error" in result) {
    return result.error;
  }

  await deleteProjectById({ id });
  return Response.json({ success: true }, { status: 200 });
}
