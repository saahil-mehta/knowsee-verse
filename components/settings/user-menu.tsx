"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, SettingsIcon, LogOutIcon, BadgeCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { GradientAvatar } from "./gradient-avatar";
import { SettingsDialog } from "./settings-dialog";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/login");
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out");
      setIsLoggingOut(false);
    }
  };

  if (!session?.user && !isPending) {
    return null;
  }

  const user = session?.user;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                {isPending ? (
                  <>
                    <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                    <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
                      Loading...
                    </span>
                  </>
                ) : (
                  <>
                    <GradientAvatar name={user?.name || user?.email || ""} image={user?.image} size="sm" />
                    <span className="flex items-center gap-1 truncate">
                      {user?.name || user?.email}
                      {user?.emailVerified && (
                        <BadgeCheck className="size-3.5 shrink-0 text-green-500" />
                      )}
                    </span>
                  </>
                )}
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-popper-anchor-width)"
              data-testid="user-nav-menu"
              side="top"
            >
              <DropdownMenuItem
                className="cursor-pointer"
                data-testid="user-nav-item-theme"
                onSelect={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOutIcon className="mr-2 size-4" />
                {isLoggingOut ? "Logging out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
