"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, LayoutDashboard, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/leads/new",
    label: "New Lead",
    icon: PlusCircle,
    isActive: (pathname: string) => pathname.startsWith("/leads/new"),
  },
  {
    href: "/recalls",
    label: "Recall Calendar",
    icon: CalendarDays,
    isActive: (pathname: string) => pathname.startsWith("/recalls"),
  },
  {
    href: "/logs",
    label: "Daily Logs",
    icon: ClipboardList,
    isActive: (pathname: string) => pathname.startsWith("/logs"),
  },
];

interface DashboardSidebarNavProps {
  collapsed?: boolean;
}

export function DashboardSidebarNav({ collapsed = false }: DashboardSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
              collapsed && "justify-center px-2",
              active
                ? "bg-zinc-100 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
            {!collapsed ? item.label : null}
          </Link>
        );
      })}
    </nav>
  );
}
