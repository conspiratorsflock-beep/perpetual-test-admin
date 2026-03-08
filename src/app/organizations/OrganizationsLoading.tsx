import { Skeleton } from "@/components/ui/skeleton";

export function OrganizationsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-4 w-96 bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 bg-slate-800" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-96 bg-slate-800" />
        <Skeleton className="h-10 w-24 bg-slate-800" />
      </div>

      <Skeleton className="h-[400px] w-full bg-slate-800" />

      <div className="flex justify-between">
        <Skeleton className="h-5 w-48 bg-slate-800" />
        <Skeleton className="h-10 w-48 bg-slate-800" />
      </div>
    </div>
  );
}
