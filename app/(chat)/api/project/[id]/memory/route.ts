import { getOwnedProject } from "@/lib/api/project-auth";
import {
  deleteAllMemoriesByProjectId,
  getMemoriesByProjectId,
} from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  const memories = await getMemoriesByProjectId({ projectId: id });
  return Response.json({ memories });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  await deleteAllMemoriesByProjectId({ projectId: id });
  return Response.json({ success: true });
}
