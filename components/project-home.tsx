"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandProfileForm } from "@/components/brand-profile-form";
import { TrashIcon } from "@/components/icons";
import { SidebarToggle } from "@/components/sidebar-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BrandProfile, Chat, Project } from "@/lib/db/schema";
import { toast } from "./toast";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
function resolveCountry(iso: string): string {
  try {
    return countryNames.of(iso.toUpperCase()) ?? iso;
  } catch {
    return iso;
  }
}

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteChat = (id: string) => {
    fetch(`/api/chat?id=${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed");
        }
        setDeleteId(null);
        router.refresh();
        toast({ type: "success", description: "Chat deleted." });
      })
      .catch(() => {
        toast({ type: "error", description: "Failed to delete chat." });
      });
  };

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
    <>
      <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
        <SidebarToggle />
      </header>
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8">
        {/* Brand profile card */}
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo
                brandName={brandProfile.brandName}
                logoUrl={brandProfile.logoUrl}
                websiteUrl={brandProfile.websiteUrl}
              />
              <div>
                <h1 className="text-xl font-semibold">
                  {brandProfile.brandName}
                </h1>
                <a
                  className="text-sm text-muted-foreground underline"
                  href={brandProfile.websiteUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {brandProfile.websiteUrl}
                </a>
              </div>
            </div>
            <Button onClick={() => setEditing(true)} size="sm" variant="ghost">
              Edit
            </Button>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Origin: {resolveCountry(brandProfile.country)}</span>
            {brandProfile.market && (
              <span>Market: {resolveCountry(brandProfile.market)}</span>
            )}
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
                <div
                  className="group relative flex items-center rounded-md hover:bg-muted"
                  key={c.id}
                >
                  <Link
                    className="flex min-w-0 flex-1 items-center justify-between px-3 py-2 text-sm"
                    href={`/chat/${c.id}`}
                  >
                    <span className="truncate">
                      {c.title || "Untitled chat"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </Link>
                  <DropdownMenu modal>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="mr-2 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                        type="button"
                      >
                        <MoreHorizontalIcon className="size-4" />
                        <span className="sr-only">More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                        onSelect={() => setDeleteId(c.id)}
                      >
                        <TrashIcon />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null);
            }
          }}
          open={!!deleteId}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                chat and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) {
                    handleDeleteChat(deleteId);
                  }
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function BrandLogo({
  brandName,
  logoUrl,
  websiteUrl,
}: {
  brandName: string;
  logoUrl: string | null;
  websiteUrl: string;
}) {
  const [errored, setErrored] = useState(false);

  const faviconUrl = (() => {
    try {
      const hostname = new URL(websiteUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return null;
    }
  })();

  const src = !errored && logoUrl ? logoUrl : faviconUrl;

  if (!src) {
    return null;
  }

  return (
    // biome-ignore lint/performance/noImgElement: external favicon — Next Image requires remotePatterns config
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError fallback for broken images
    <img
      alt={brandName}
      className="size-10 shrink-0 rounded-lg"
      onError={() => {
        if (!errored && logoUrl) {
          setErrored(true);
        }
      }}
      src={src}
    />
  );
}
