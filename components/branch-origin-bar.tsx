import Link from "next/link";
import { BranchIcon } from "./icons";

export function BranchOriginBar({
  parentChat,
}: {
  parentChat: { id: string; title: string };
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-muted-foreground text-sm">
      <BranchIcon size={14} />
      <span>
        Branched from{" "}
        <span className="font-medium text-foreground">{parentChat.title}</span>
      </span>
      <span className="text-border">·</span>
      <Link
        className="font-medium text-primary hover:underline"
        href={`/chat/${parentChat.id}`}
      >
        View original
      </Link>
    </div>
  );
}
