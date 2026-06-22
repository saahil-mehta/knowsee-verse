"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { UserMenu } from "@/components/settings";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import { SidebarNavGroups } from "@/components/sidebar-nav-groups";
import { SidebarProjects } from "@/components/sidebar-projects";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isCollapsed = state === "collapsed";

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        setShowDeleteAllDialog(false);
        router.replace("/");
        router.refresh();
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <div className="flex flex-row items-center justify-between gap-2">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Open sidebar"
                      className="group/logo relative flex h-8 w-8 shrink-0 items-center justify-center"
                      onClick={toggleSidebar}
                      type="button"
                    >
                      <span className="font-serif text-2xl leading-none transition-opacity group-hover/logo:opacity-0">
                        K
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/logo:opacity-100">
                        <PanelLeftOpen size={16} />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent align="start" side="bottom">
                    Open sidebar
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  className="flex min-w-0 flex-row items-center"
                  href="/"
                  onClick={() => {
                    setOpenMobile(false);
                  }}
                >
                  <span className="cursor-pointer rounded-md px-2 font-serif text-2xl hover:bg-muted">
                    <span className="font-normal">Know</span>
                    <span className="-ml-0.5 font-light italic opacity-70">
                      see.
                    </span>
                  </span>
                </Link>
              )}
              <div
                className={cn("flex flex-row gap-1", isCollapsed && "hidden")}
              >
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="h-8 p-1 md:h-fit md:p-2"
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                        variant="ghost"
                      >
                        <TrashIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 p-1 md:h-fit md:p-2"
                      data-tour="new-chat"
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/");
                        router.refresh();
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <PlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    New Chat
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Close sidebar"
                      className="h-8 p-1 md:h-fit md:p-2"
                      onClick={toggleSidebar}
                      type="button"
                      variant="ghost"
                    >
                      <PanelLeftClose size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    Close sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className={cn(isCollapsed && "hidden")}>
          <SidebarProjects user={user} />
          <SidebarHistory user={user} />
          <SidebarNavGroups
            onAction={{ feedback: () => setShowFeedback(true) }}
          />
        </SidebarContent>
        <SidebarFooter className={cn(isCollapsed && "hidden")}>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackDialog onOpenChange={setShowFeedback} open={showFeedback} />
    </>
  );
}
