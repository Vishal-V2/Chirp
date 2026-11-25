import {
  Bell,
  Bookmark,
  Home,
  Mail,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show a live unread count on this item. */
  unreadBadge?: "messages" | "notifications";
  /** Hidden in the 5-slot mobile tab bar. */
  desktopOnly?: boolean;
};

export function getNavItems(username: string): NavItem[] {
  return [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Search },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      unreadBadge: "notifications",
    },
    {
      href: "/messages",
      label: "Messages",
      icon: Mail,
      unreadBadge: "messages",
    },
    {
      href: "/bookmarks",
      label: "Bookmarks",
      icon: Bookmark,
      desktopOnly: true,
    },
    { href: `/${username}`, label: "Profile", icon: User },
  ];
}
