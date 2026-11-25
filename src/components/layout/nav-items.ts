import { Bell, Bookmark, Home, Search, User, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export function getNavItems(username: string): NavItem[] {
  return [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Search },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: `/${username}`, label: "Profile", icon: User },
  ];
}
