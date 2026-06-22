"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_GROUPS, type NavAction } from "@/lib/nav/groups";

// Renders the static workspace nav from NAV_GROUPS. Route items become links;
// action items render only when a handler for that action is provided, so an
// unwired action never ships as a dead control.
export function SidebarNavGroups({
  onAction,
}: {
  onAction?: Partial<Record<NavAction, () => void>>;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <>
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(
          (item) => item.href || (item.action && onAction?.[item.action])
        );
        if (visibleItems.length === 0) {
          return null;
        }
        return (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  if (item.href) {
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton asChild tooltip={item.description}>
                          <Link
                            href={item.href}
                            onClick={() => setOpenMobile(false)}
                          >
                            <Icon className="size-4" strokeWidth={1.75} />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  const handler = item.action
                    ? onAction?.[item.action]
                    : undefined;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        onClick={() => {
                          setOpenMobile(false);
                          handler?.();
                        }}
                        tooltip={item.description}
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
