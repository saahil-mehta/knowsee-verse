"use client";

import { UserIcon, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AccountSettings } from "./account-settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tabs = [{ id: "account" as const, label: "Account", icon: UserIcon }];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const activeTab = "account";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="h-[80vh] max-h-[600px] max-w-3xl gap-0 overflow-hidden border border-sidebar-border bg-sidebar p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <button
          className="absolute top-4 left-4 z-10 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex h-full">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 border-r border-sidebar-border bg-sidebar px-4 pt-14">
            <ul className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ease-out",
                        isActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                      type="button"
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex flex-1 flex-col bg-background">
            <div className="flex h-14 shrink-0 items-center border-b border-border/50 px-6">
              <h2 className="text-lg font-semibold">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AccountSettings />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
