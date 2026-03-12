"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  MoreHorizontalIcon,
  PencilEditIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { User } from "@/lib/auth";
import type { Project } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

export function SidebarProjects({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/project/")
    ? pathname.split("/")[2]
    : null;

  const {
    data: projects,
    isLoading,
    mutate,
  } = useSWR<Project[]>(user ? "/api/project" : null, fetcher);

  const [showDialog, setShowDialog] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isRename = !!renameId;
  const dialogOpen = showDialog || isRename;

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [dialogOpen]);

  if (!user) {
    return null;
  }

  const handleDelete = (id: string) => {
    const deletePromise = fetch(`/api/project/${id}`, { method: "DELETE" });

    toast.promise(deletePromise, {
      loading: "Deleting project...",
      success: async () => {
        setDeleteId(null);
        await mutate();
        if (activeId === id) {
          router.push("/");
        }
        return "Project deleted";
      },
      error: "Failed to delete project",
    });
  };

  const closeDialog = () => {
    setShowDialog(false);
    setRenameId(null);
    setNewName("");
  };

  const handleSubmitDialog = () => {
    const name = newName.trim();
    if (!name || submitting) {
      return;
    }

    setSubmitting(true);

    if (renameId) {
      const renamePromise = fetch(`/api/project/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      toast.promise(renamePromise, {
        loading: "Renaming project...",
        success: async () => {
          closeDialog();
          await mutate();
          router.refresh();
          return "Project renamed";
        },
        error: "Failed to rename project",
        finally: () => setSubmitting(false),
      });
      return;
    }

    const createPromise = fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    toast.promise(createPromise, {
      loading: "Creating project...",
      success: async (res) => {
        const created = await res.json();
        closeDialog();
        await mutate();
        setOpenMobile(false);
        router.push(`/project/${created.id}`);
        return "Project created";
      },
      error: "Failed to create project",
      finally: () => setSubmitting(false),
    });
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
          Projects
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[48, 36].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-md px-2"
                key={item}
              >
                <div
                  className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sidebar-foreground/50 text-xs">Projects</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-fit p-1"
                onClick={() => setShowDialog(true)}
                type="button"
                variant="ghost"
              >
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="end" className="hidden md:block">
              New Project
            </TooltipContent>
          </Tooltip>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {projects && projects.length > 0 ? (
              projects.map((proj) => (
                <SidebarMenuItem key={proj.id}>
                  <SidebarMenuButton asChild isActive={proj.id === activeId}>
                    <Link
                      href={`/project/${proj.id}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <span className="truncate">{proj.name}</span>
                    </Link>
                  </SidebarMenuButton>

                  <DropdownMenu modal>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction
                        className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        showOnHover={proj.id !== activeId}
                      >
                        <MoreHorizontalIcon />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => {
                          setRenameId(proj.id);
                          setNewName(proj.name);
                        }}
                      >
                        <PencilEditIcon size={12} />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                        onSelect={() => setDeleteId(proj.id)}
                      >
                        <TrashIcon />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))
            ) : (
              <div className="px-2 py-1 text-sm text-zinc-500">
                No projects yet.
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
        open={dialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRename ? "Rename project" : "New project"}
            </DialogTitle>
            <DialogDescription>
              {isRename
                ? "Enter a new name for the project."
                : "Give your brand project a name. You can change it later."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitDialog();
            }}
          >
            <Input
              disabled={submitting}
              maxLength={256}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Samsung UK Audit"
              ref={inputRef}
              value={newName}
            />
            <DialogFooter className="mt-4">
              <Button onClick={closeDialog} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={!newName.trim() || submitting} type="submit">
                {isRename ? "Rename" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              This action cannot be undone. This will permanently delete the
              project, its brand profile, and all associated chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  handleDelete(deleteId);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
