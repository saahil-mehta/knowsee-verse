"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronDownIcon, DatabaseIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Memory } from "@/lib/db/schema";
import { cn, fetcher } from "@/lib/utils";
import { toast } from "./toast";

function displayName(path: string): string {
  return path.replace(/^\/memories\//, "");
}

function MemoryCard({
  memory,
  onDelete,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const lines = memory.content.split("\n");
  const isLong = lines.length > 6;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium font-mono text-foreground truncate">
          {displayName(memory.path)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(memory.updatedAt), {
            addSuffix: true,
          })}
        </span>
      </div>

      <Collapsible onOpenChange={setOpen} open={!isLong || open}>
        <div className="relative">
          <CollapsibleContent forceMount>
            <pre
              className={cn(
                "text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed",
                isLong && !open && "max-h-[8rem] overflow-hidden"
              )}
            >
              {memory.content || "(empty)"}
            </pre>
          </CollapsibleContent>
          {isLong && !open && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>

        {isLong && (
          <CollapsibleTrigger asChild>
            <button
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <ChevronDownIcon
                className={cn(
                  "size-3 transition-transform",
                  open && "rotate-180"
                )}
              />
              {open ? "Show less" : `Show all ${lines.length} lines`}
            </button>
          </CollapsibleTrigger>
        )}
      </Collapsible>

      <div className="flex justify-end">
        <Button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(memory.id)}
          size="icon-sm"
          variant="ghost"
        >
          <TrashIcon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}

export function MemoryDialog({ projectId }: { projectId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ memories: Memory[] }>(
    dialogOpen ? `/api/project/${projectId}/memory` : null,
    fetcher
  );

  const memories = data?.memories ?? [];

  const handleDelete = (memoryId: string) => {
    setDeleteId(memoryId);
  };

  const confirmDelete = () => {
    if (!deleteId) {
      return;
    }

    const target = memories.find((m) => m.id === deleteId);
    const optimistic = memories.filter((m) => m.id !== deleteId);

    mutate({ memories: optimistic }, false);
    setDeleteId(null);

    fetch(`/api/project/${projectId}/memory/${deleteId}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to delete");
        }
        toast({
          type: "success",
          description: `Deleted ${target ? displayName(target.path) : "memory file"}.`,
        });
        mutate();
      })
      .catch(() => {
        toast({ type: "error", description: "Failed to delete memory file." });
        mutate();
      });
  };

  const confirmClearAll = () => {
    mutate({ memories: [] }, false);
    setClearAllOpen(false);

    fetch(`/api/project/${projectId}/memory`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to clear");
        }
        toast({ type: "success", description: "All memories cleared." });
        mutate();
      })
      .catch(() => {
        toast({ type: "error", description: "Failed to clear memories." });
        mutate();
      });
  };

  return (
    <>
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost">
            <DatabaseIcon className="size-4" />
            <span>
              Memory
              {memories.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({memories.length})
                </span>
              )}
            </span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Brand Memory</DialogTitle>
            <DialogDescription>
              Knowsee stores learnings about your brand across conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {isLoading && (
              <>
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton
                  className="h-24 rounded-lg"
                  style={{ animationDelay: "150ms" }}
                />
                <Skeleton
                  className="h-24 rounded-lg"
                  style={{ animationDelay: "300ms" }}
                />
              </>
            )}

            {!isLoading && memories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DatabaseIcon className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">No memories yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Knowsee will store learnings about your brand as you chat.
                </p>
              </div>
            )}

            {!isLoading &&
              memories.map((m) => (
                <MemoryCard key={m.id} memory={m} onDelete={handleDelete} />
              ))}
          </div>

          {!isLoading && memories.length > 0 && (
            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                className="text-destructive"
                onClick={() => setClearAllOpen(true)}
                size="sm"
                variant="outline"
              >
                Clear All
              </Button>
              <Button onClick={() => setDialogOpen(false)} size="sm">
                Done
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete single file confirmation */}
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
            <AlertDialogTitle>Delete memory file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this memory file. Knowsee will no
              longer reference it in future conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation */}
      <AlertDialog onOpenChange={setClearAllOpen} open={clearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all memory files for this brand
              project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
