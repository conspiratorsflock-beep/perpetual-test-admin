"use client";

import { useState, useCallback, useTransition } from "react";
import { useVisiblePolling } from "@/lib/hooks/use-visible-polling";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, ChevronLeft, ChevronRight, Search, Calendar, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchOrganizations, exportOrganizationsToCSV } from "@/lib/actions/organizations";
import { downloadCSV } from "@/lib/utils/export-download";
import type { AdminOrganization, TrialLockState } from "@/types/admin";

const PAGE_SIZE = 25;

const trialStateColors: Record<TrialLockState, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  soft_locked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hard_locked: "bg-red-500/20 text-red-400 border-red-500/30",
  paid: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const trialStateLabels: Record<TrialLockState, string> = {
  active: "Trial",
  soft_locked: "Soft Locked",
  hard_locked: "Hard Locked",
  paid: "Paid",
};

export function OrganizationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = await exportOrganizationsToCSV();
      const date = new Date().toISOString().split("T")[0];
      downloadCSV(csv, `organizations-${date}.csv`);
    } catch (error) {
      console.error("Failed to export organizations:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchOrganizations({
        query: query || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setOrgs(result.orgs);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, page]);

  useVisiblePolling(fetchOrgs, 30000);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/organizations?${params.toString()}`);
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-100">Organizations</h1>
            {isLoading && orgs.length > 0 && (
              <span className="text-xs text-slate-500 animate-pulse">Refreshing...</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Manage organizations, view memberships, and control trial states.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-semibold text-slate-100">{total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search organizations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          disabled={isPending}
        >
          Search
        </Button>
      </form>

      {/* Table */}
      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Trial State</TableHead>
              <TableHead className="text-slate-400">Trial Ends</TableHead>
              <TableHead className="text-slate-400">Extension</TableHead>
              <TableHead className="text-slate-400">Members</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length > 0 ? (
              orgs.map((org) => (
                <TableRow key={org.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <Link
                      href={`/organizations/${org.id}`}
                      className="font-medium text-slate-200 hover:text-amber-400 transition-colors"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-slate-500">{org.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={trialStateColors[org.trialLockState]}>
                      {trialStateLabels[org.trialLockState]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {org.trialEndsAt ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        {format(new Date(org.trialEndsAt), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.trialExtensionUsed ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Used
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">{org.memberCount}</TableCell>
                  <TableCell className="text-slate-400">
                    {format(new Date(org.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No organizations found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} organizations
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
