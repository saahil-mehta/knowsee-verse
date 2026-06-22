"use client";

import { Loader2, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listChatShares,
  searchShareCandidates,
  shareChat,
  unshareChat,
} from "@/app/(chat)/actions";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

type ShareUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export function ShareButton({ chatId }: { chatId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="hidden h-8 md:flex md:h-fit md:px-2"
        data-testid="share-button"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Share2 className="size-4" />
        <span className="md:sr-only">Share</span>
      </Button>
      {open && (
        <ShareDialog chatId={chatId} onOpenChange={setOpen} open={open} />
      )}
    </>
  );
}

function ShareDialog({
  chatId,
  open,
  onOpenChange,
}: {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [shares, setShares] = useState<ShareUser[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShareUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    try {
      const rows = await listChatShares(chatId);
      setShares(rows);
    } catch {
      toast.error("Could not load who this chat is shared with.");
    }
  }, [chatId]);

  // Load current recipients once when the dialog mounts.
  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // Debounced colleague search; clears when the box is empty.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const found = await searchShareCandidates(trimmed);
        setResults(found);
      } catch {
        toast.error("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  const sharedIds = new Set(shares.map((s) => s.id));
  const candidates = results.filter((u) => !sharedIds.has(u.id));

  const handleShare = async (target: ShareUser) => {
    setPendingId(target.id);
    // Optimistic: show the recipient straight away, reconcile on failure.
    setShares((prev) => [...prev, target]);
    setQuery("");
    setResults([]);
    try {
      await shareChat({ chatId, targetUserId: target.id });
    } catch {
      toast.error(`Could not share with ${target.name}.`);
      await loadShares();
    } finally {
      setPendingId(null);
    }
  };

  const handleUnshare = async (target: ShareUser) => {
    setPendingId(target.id);
    setShares((prev) => prev.filter((s) => s.id !== target.id));
    try {
      await unshareChat({ chatId, targetUserId: target.id });
    } catch {
      toast.error(`Could not remove ${target.name}.`);
      await loadShares();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share chat</DialogTitle>
          <DialogDescription>
            Share with specific colleagues. They get read-only access to this
            conversation.
          </DialogDescription>
        </DialogHeader>

        <Input
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or email"
          value={query}
        />

        {query.trim().length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border">
            {searching && (
              <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
                <Loader2 className="size-3.5 animate-spin" />
                Searching...
              </div>
            )}
            {!searching && candidates.length === 0 && (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                No people found.
              </div>
            )}
            {!searching &&
              candidates.map((u) => (
                <button
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                  disabled={pendingId === u.id}
                  key={u.id}
                  onClick={() => handleShare(u)}
                  type="button"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{u.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {u.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    Add
                  </span>
                </button>
              ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">People with access</p>
          {shares.length === 0 ? (
            <p className="px-1 py-2 text-muted-foreground text-sm">
              Only you can see this chat.
            </p>
          ) : (
            shares.map((s) => (
              <div
                className="flex items-center justify-between gap-3 px-1 py-1.5 text-sm"
                key={s.id}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {s.email}
                  </span>
                </span>
                <Button
                  className="size-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                  disabled={pendingId === s.id}
                  onClick={() => handleUnshare(s)}
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove {s.name}</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          People you add can see the results in this chat, which ran under your
          access.
        </p>
      </DialogContent>
    </Dialog>
  );
}
