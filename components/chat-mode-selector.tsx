"use client";

import { MessageSquareIcon, ShoppingCartIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";

export type ChatMode = "standard" | "commerce";

const chatModes: Array<{
  id: ChatMode;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "standard",
    label: "Standard",
    description: "General-purpose assistant",
    icon: <MessageSquareIcon className="size-4" />,
  },
  {
    id: "commerce",
    label: "Commerce",
    description: "Product research, price comparison, and brand audits",
    icon: <ShoppingCartIcon className="size-4" />,
  },
];

export function ChatModeSelector({
  selectedChatMode,
  onChatModeChange,
  disabled,
  className,
}: {
  selectedChatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  const selectedMode = useMemo(
    () => chatModes.find((mode) => mode.id === selectedChatMode),
    [selectedChatMode]
  );

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
        disabled={disabled}
      >
        <Button
          className="hidden h-8 md:flex md:h-fit md:px-2"
          data-testid="chat-mode-selector"
          variant="outline"
        >
          {selectedMode?.icon}
          <span className="md:sr-only">{selectedMode?.label}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        {chatModes.map((mode) => (
          <DropdownMenuItem
            className="group/item flex flex-row items-center justify-between gap-4"
            data-active={mode.id === selectedChatMode}
            data-testid={`chat-mode-selector-item-${mode.id}`}
            key={mode.id}
            onSelect={() => {
              onChatModeChange(mode.id);
              setOpen(false);
            }}
          >
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                {mode.icon}
                {mode.label}
              </div>
              {mode.description && (
                <div className="text-muted-foreground text-xs">
                  {mode.description}
                </div>
              )}
            </div>
            <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
              <CheckCircleFillIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
