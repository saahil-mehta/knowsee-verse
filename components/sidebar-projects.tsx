"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
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
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (showDialog) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [showDialog]);

  if (!user) {
    return null;
  }

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || submitting) {
      return;
    }

    setSubmitting(true);

    const createPromise = fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    toast.promise(createPromise, {
      loading: "Creating project...",
      success: async (res) => {
        const created = await res.json();
        setShowDialog(false);
        setNewName("");
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

      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Give your brand project a name. You can change it later.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
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
              <Button
                onClick={() => {
                  setShowDialog(false);
                  setNewName("");
                }}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={!newName.trim() || submitting} type="submit">
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
