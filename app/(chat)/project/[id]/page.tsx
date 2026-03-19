import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandProfileSetup } from "@/components/brand-profile-setup";
import { ProjectHome } from "@/components/project-home";
import { getSession } from "@/lib/auth";
import {
  getBrandProfileByProjectId,
  getChatsByProjectId,
  getDocumentsByProjectId,
  getProjectById,
} from "@/lib/db/queries";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ProjectPage params={props.params} />
    </Suspense>
  );
}

async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proj = await getProjectById({ id });

  if (!proj) {
    return notFound();
  }

  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (proj.userId !== session.user.id) {
    return notFound();
  }

  const profile = await getBrandProfileByProjectId({ projectId: id });

  if (!profile) {
    return (
      <div className="flex h-dvh min-w-0 flex-col bg-background">
        <BrandProfileSetup projectId={id} />
      </div>
    );
  }

  const [chats, documents] = await Promise.all([
    getChatsByProjectId({ projectId: id }),
    getDocumentsByProjectId({ projectId: id }),
  ]);

  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-y-auto bg-background">
      <ProjectHome
        brandProfile={profile}
        chats={chats}
        documents={documents}
        project={proj}
      />
    </div>
  );
}
