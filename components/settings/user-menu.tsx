"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
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
import { signOut, useSession } from "@/lib/auth-client";
import { GradientAvatar } from "./gradient-avatar";
import { SettingsDialog } from "./settings-dialog";

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
                className="h-10 bg-background focus-visible:ring-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                    <GradientAvatar
                      image={user?.image}
                      name={user?.name || user?.email || ""}
                      size="sm"
                    />
                    <span className="truncate">
                      {user?.name || user?.email}
                    </span>
                  </>
                )}
                <ChevronUp className="ml-auto" strokeWidth={1.5} />
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
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
    </>
  );
}
