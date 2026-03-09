"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  chatTitle,
  selectedVisibilityType,
  isReadonly,
  projectContext,
}: {
  chatId: string;
  chatTitle: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  projectContext?: { projectId: string; projectName: string } | null;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {projectContext && (
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <Link
            className="shrink-0 text-muted-foreground transition hover:text-foreground"
            href={`/project/${projectContext.projectId}`}
          >
            {projectContext.projectName}
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate text-muted-foreground">
            {chatTitle || "New chat"}
          </span>
        </div>
      )}

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className="order-1 md:order-2"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.chatTitle === nextProps.chatTitle &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.projectContext?.projectId === nextProps.projectContext?.projectId
  );
});
