"use client";

import { useEffect, useState } from "react";
import { Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardSidebarNav } from "@/components/layout/DashboardSidebarNav";

const STORAGE_KEY = "dashboard_sidebar_collapsed";

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen overflow-y-auto border-r border-zinc-200 bg-white/90 p-4 backdrop-blur transition-[width] duration-300",
        collapsed ? "w-full lg:w-[92px]" : "w-full lg:w-[272px]",
      )}
    >
      <div className={cn("mb-8 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-zinc-900" />
          <span className={cn("text-sm font-semibold text-zinc-900", collapsed && "hidden")}>Restaurant CRM</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-8 w-8"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <DashboardSidebarNav collapsed={collapsed} />
    </aside>
  );
}
