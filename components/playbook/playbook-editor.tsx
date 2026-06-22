"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { PlaybookSectionWithEditor } from "@/lib/db/queries";
import { fetcher } from "@/lib/utils";

type Section = Omit<PlaybookSectionWithEditor, "lastEditedAt" | "createdAt"> & {
  lastEditedAt: string;
  createdAt: string;
};

export function PlaybookEditor() {
  const { data, error, isLoading, mutate } = useSWR<Section[]>(
    "/api/playbook",
    fetcher
  );
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        throw new Error("create failed");
      }
      setNewTitle("");
      setAdding(false);
      mutate();
    } catch {
      toast.error("Could not add section. Try again.");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-destructive text-sm">
        Could not load the playbook. Refresh to try again.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {data.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        data.map((section, i) => (
          <div
            className={i > 0 ? "border-border/40 border-t" : ""}
            key={section.key}
          >
            <SectionItem mutate={mutate} section={section} />
          </div>
        ))
      )}

      <div
        className={
          data.length > 0
            ? "border-border/40 border-t pt-4"
            : adding
              ? "pt-4"
              : "hidden"
        }
      >
        {adding ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="h-9 flex-1 text-sm"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdd();
                }
                if (e.key === "Escape") {
                  setNewTitle("");
                  setAdding(false);
                }
              }}
              placeholder="Section title"
              value={newTitle}
            />
            <Button
              disabled={creating || !newTitle.trim()}
              onClick={handleAdd}
              size="sm"
            >
              {creating ? <Loader2 className="size-3 animate-spin" /> : "Add"}
            </Button>
            <Button
              onClick={() => {
                setNewTitle("");
                setAdding(false);
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : data.length > 0 ? (
          <Button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setAdding(true)}
            size="sm"
            variant="ghost"
          >
            <Plus className="mr-1.5 size-3.5" />
            Add section
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="font-medium text-foreground text-sm">No sections yet</p>
      <p className="mt-1.5 max-w-xs text-muted-foreground text-xs leading-relaxed">
        Add sections to give Knowsee shared context. Anyone signed in can add or
        edit. Empty sections do not appear in the prompt.
      </p>
      <Button className="mt-5" onClick={onAdd} size="sm">
        <Plus className="mr-1.5 size-3.5" />
        Add first section
      </Button>
    </div>
  );
}

function SectionItem({
  section,
  mutate,
}: {
  section: Section;
  mutate: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(section.body);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const hasBody = section.body.trim().length > 0;
  const editorLabel = section.lastEditedByName ?? section.lastEditedByEmail;
  const editedAt = new Date(section.lastEditedAt);

  const patch = async (payload: { title?: string; body?: string }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/playbook/${section.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("save failed");
      }
      mutate();
    } catch (error) {
      toast.error("Could not save. Try again.");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === section.title) {
      setTitleDraft(section.title);
      setEditingTitle(false);
      return;
    }
    try {
      await patch({ title: trimmed });
      setEditingTitle(false);
    } catch {
      setTitleDraft(section.title);
    }
  };

  const handleSaveBody = async () => {
    try {
      await patch({ body: bodyDraft });
      setEditingBody(false);
    } catch {
      // keep editor open so the user can retry
    }
  };

  const handleCancelBody = () => {
    setBodyDraft(section.body);
    setEditingBody(false);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/playbook/${section.key}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("delete failed");
      }
      mutate();
    } catch {
      toast.error("Could not delete. Try again.");
    }
  };

  return (
    <div className="group py-5">
      <div className="flex items-start justify-between gap-3">
        {editingTitle ? (
          <Input
            autoFocus
            className="h-8 max-w-md flex-1 font-medium text-sm"
            onBlur={handleSaveTitle}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setTitleDraft(section.title);
                setEditingTitle(false);
              }
            }}
            value={titleDraft}
          />
        ) : (
          <button
            className="-mx-1.5 rounded px-1.5 py-0.5 text-left font-medium text-foreground text-sm transition-colors hover:bg-accent/40"
            onClick={() => {
              setTitleDraft(section.title);
              setEditingTitle(true);
            }}
            type="button"
          >
            {section.title}
          </button>
        )}

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {!editingBody && (
            <Button
              aria-label="Edit body"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setBodyDraft(section.body);
                setEditingBody(true);
              }}
              size="icon"
              variant="ghost"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          <Button
            aria-label="Delete section"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDelete(true)}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2">
        {editingBody ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              className="min-h-[120px] font-mono text-xs leading-relaxed"
              onChange={(e) => setBodyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCancelBody();
                }
              }}
              placeholder="Markdown is supported. Leave empty to omit this section from the prompt."
              value={bodyDraft}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                disabled={saving}
                onClick={handleCancelBody}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={saving} onClick={handleSaveBody} size="sm">
                {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : hasBody ? (
          <button
            className="-mx-1.5 block w-full rounded px-1.5 py-1 text-left transition-colors hover:bg-accent/40"
            onClick={() => {
              setBodyDraft(section.body);
              setEditingBody(true);
            }}
            type="button"
          >
            <p className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
              {section.body}
            </p>
          </button>
        ) : (
          <button
            className="-mx-1.5 rounded px-1.5 py-1 text-left text-muted-foreground text-xs italic transition-colors hover:bg-accent/40"
            onClick={() => {
              setBodyDraft(section.body);
              setEditingBody(true);
            }}
            type="button"
          >
            Click to add content. Empty sections do not appear in the prompt.
          </button>
        )}
      </div>

      <p className="mt-2 text-muted-foreground text-xs">
        {editorLabel
          ? `Last edited by ${editorLabel}, ${formatDistanceToNow(editedAt, {
              addSuffix: true,
            })}`
          : "Just added"}
      </p>

      <AlertDialog onOpenChange={setShowDelete} open={showDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{section.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the section from Knowsee's context. Anyone can add a
              new section later, but the body will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
