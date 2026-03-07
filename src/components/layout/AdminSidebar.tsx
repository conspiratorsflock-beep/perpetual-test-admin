"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Settings,
  Sliders,
  ToggleLeft,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/admin";

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: Building2,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
    children: [
      { label: "Activity", href: "/support/activity", icon: Activity },
      { label: "Flags", href: "/support/flags", icon: ToggleLeft },
      { label: "Announcements", href: "/support/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "System",
    href: "/system",
    icon: Settings,
    children: [
      { label: "Health", href: "/system/health", icon: HeartPulse },
      { label: "Logs", href: "/system/logs", icon: FileText },
      { label: "Config", href: "/system/config", icon: Sliders },
    ],
  },
  {
    label: "Docs",
    href: "/docs",
    icon: BookOpen,
  },
];

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          depth > 0 && "ml-4",
          isActive
            ? "bg-amber-500/10 text-amber-400"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        )}
      >
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-amber-400" : "text-slate-500"
          )}
        />
        {item.label}
      </Link>
      {item.children && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-800 bg-slate-950">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <span className="text-sm font-semibold text-slate-100">
          Perpetual Test{" "}
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-400">
            Admin
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navigation.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-xs text-slate-600">Admin Console v0.1</p>
      </div>
    </aside>
  );
}
