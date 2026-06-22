import { BookOpen, type LucideIcon, MessageSquarePlus } from "lucide-react";

// A nav item is either a route (`href`) or a command (`action`). Action items
// render as a button that triggers a handler instead of navigating.
export type NavAction = "feedback";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  description: string;
  href?: string;
  action?: NavAction;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

// Static workspace nav. Dynamic surfaces (chats, brand projects) render in
// their own sidebar sections; this config holds the fixed help and utility
// links and is the single source the guide page reads from, so the sidebar and
// the guide cannot drift apart.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "help",
    label: "Help",
    icon: BookOpen,
    items: [
      {
        label: "Guide",
        href: "/guide",
        icon: BookOpen,
        description: "What Knowsee does, how to ask, and a replayable tour.",
      },
      {
        label: "Send feedback",
        action: "feedback",
        icon: MessageSquarePlus,
        description:
          "A bug, an idea, or something that felt off? Tell the team.",
      },
    ],
  },
];
