"use client";

import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "./feedback-form";

const PRODUCT_CATEGORIES = ["Bug", "Idea", "Confusing", "Other"] as const;

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            A bug, an idea, or something that felt off? Tell us. It goes
            straight to the team and helps Knowsee get sharper.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm
          categories={PRODUCT_CATEGORIES}
          context={{ kind: "product", pageContext: pathname ?? undefined }}
          onDone={() => onOpenChange(false)}
          placeholder="What's on your mind?"
        />
      </DialogContent>
    </Dialog>
  );
}
