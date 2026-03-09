"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandProfileForm } from "@/components/brand-profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BrandProfile, Chat, Project } from "@/lib/db/schema";

export function ProjectHome({
  project,
  brandProfile,
  chats,
}: {
  project: Project;
  brandProfile: BrandProfile;
  chats: Chat[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <BrandProfileForm
        initialData={brandProfile}
        onCancel={() => setEditing(false)}
        projectId={project.id}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8">
      {/* Brand profile card */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{brandProfile.brandName}</h1>
            <a
              className="text-sm text-muted-foreground underline"
              href={brandProfile.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {brandProfile.websiteUrl}
            </a>
          </div>
          <Button onClick={() => setEditing(true)} size="sm" variant="ghost">
            Edit
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Country: {brandProfile.country}
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Categories
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(brandProfile.categories as string[]).map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Competitors
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(brandProfile.competitors as string[]).map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Retailers
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(brandProfile.retailers as string[]).map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Project chats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Chats</h2>
          <Button
            onClick={() => router.push(`/?projectId=${project.id}`)}
            size="sm"
          >
            New Chat
          </Button>
        </div>

        {chats.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No chats yet. Start a new one above.
          </p>
        ) : (
          <div className="space-y-1">
            {chats.map((c) => (
              <Link
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                href={`/chat/${c.id}`}
                key={c.id}
              >
                <span className="truncate">{c.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
