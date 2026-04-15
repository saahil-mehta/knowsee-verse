import { getOwnedProject } from "@/lib/api/project-auth";
import { deleteMemoryById, getMemoriesByProjectId } from "@/lib/db/queries";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
  const { id, memoryId } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  // Verify the memory belongs to this project
  const memories = await getMemoriesByProjectId({ projectId: id });
  const target = memories.find((m) => m.id === memoryId);

  if (!target) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deleteMemoryById({ id: memoryId });
  return Response.json({ success: true });
}
