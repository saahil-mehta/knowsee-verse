"use client";

import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import {
  type ChatMode,
  ChatModeSelector,
} from "@/components/chat-mode-selector";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  selectedChatMode,
  onChatModeChange,
  isChatModeLocked,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  selectedChatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  isChatModeLocked: boolean;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

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
        <>
          <ChatModeSelector
            className="order-1 md:order-2"
            disabled={isChatModeLocked}
            onChatModeChange={onChatModeChange}
            selectedChatMode={selectedChatMode}
          />
          <VisibilitySelector
            chatId={chatId}
            className="order-1 md:order-3"
            selectedVisibilityType={selectedVisibilityType}
          />
        </>
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.selectedChatMode === nextProps.selectedChatMode &&
    prevProps.isChatModeLocked === nextProps.isChatModeLocked &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
