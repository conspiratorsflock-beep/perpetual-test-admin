"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HelpDeskLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-4 w-96 bg-slate-800" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full bg-slate-800" />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 bg-slate-800" />
          ))}
        </div>

        <Skeleton className="h-[400px] w-full bg-slate-800" />
      </div>
    </div>
  );
}
