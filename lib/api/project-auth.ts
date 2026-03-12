import { getSession } from "@/lib/auth";
import { getProjectById, getProjectWithBrandProfile } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

/**
 * Verify the current session user owns the given project.
 * Returns the project on success or a pre-built error Response.
 */
export async function getOwnedProject(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: new ChatSDKError("unauthorized:project").toResponse() };
  }

  const proj = await getProjectById({ id });

  if (!proj) {
    return { error: new ChatSDKError("not_found:project").toResponse() };
  }

  if (proj.userId !== session.user.id) {
    return { error: new ChatSDKError("forbidden:project").toResponse() };
  }

  return { project: proj, session };
}

/**
 * Same ownership check but also fetches the brand profile in one query.
 */
export async function getOwnedProjectWithProfile(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: new ChatSDKError("unauthorized:project").toResponse() };
  }

  const result = await getProjectWithBrandProfile({ projectId: id });

  if (!result) {
    return { error: new ChatSDKError("not_found:project").toResponse() };
  }

  if (result.project.userId !== session.user.id) {
    return { error: new ChatSDKError("forbidden:project").toResponse() };
  }

  return { ...result, session };
}
