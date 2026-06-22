"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/auth";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

export function SidebarShared({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const { data: chats } = useSWR<Chat[]>(
    user ? "/api/chat/shared" : null,
    fetcher
  );

  if (!(user && chats) || chats.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
        Shared with me
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton asChild isActive={chat.id === activeId}>
                <Link
                  href={`/chat/${chat.id}`}
                  onClick={() => setOpenMobile(false)}
                >
                  <span className="truncate">{chat.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
