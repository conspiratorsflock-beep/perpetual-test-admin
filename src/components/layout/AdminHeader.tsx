"use client";

import { Bell } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";
import { ClientUserButton } from "./ClientUserButton";

export function AdminHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
      <div className="flex items-center gap-3">
        {/* Mobile sidebar trigger */}
        <MobileSidebar />
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <ClientUserButton />
      </div>
    </header>
  );
}
