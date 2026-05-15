"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Container,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Timer,
  FolderKanban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchBuilds, getBuildMetrics } from "@/lib/actions/build-queue";
import type { BuildQueueItem, BuildQueueItemStatus } from "@/types/admin";

const PAGE_SIZE = 25;

const statusIcons: Record<BuildQueueItemStatus, React.ReactNode> = {
  pending: <HelpCircle className="h-4 w-4 text-slate-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  cancelled: <XCircle className="h-4 w-4 text-slate-400" />,
};

const statusColors: Record<BuildQueueItemStatus, string> = {
  pending: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function BuildsPage() {
  const [builds, setBuilds] = useState<BuildQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BuildQueueItemStatus | "">("");
  const [metrics, setMetrics] = useState<{
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
    cancelled: number;
    avgDurationMs: number;
    byProvider: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, m] = await Promise.all([
        searchBuilds({
          provider: providerFilter || undefined,
          status: (statusFilter as BuildQueueItemStatus) || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        getBuildMetrics(),
      ]);
      setBuilds(result.builds);
      setTotal(result.total);
      setMetrics(m);
    } catch (error) {
      console.error("Failed to fetch builds:", error);
    } finally {
      setIsLoading(false);
    }
  }, [providerFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Build Queue</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor CI/CD build events flowing into Lathe Studio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Container className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.total || 0}</p>
                <p className="text-xs text-slate-500">Total Builds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.pending || 0}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.failed || 0}</p>
                <p className="text-xs text-slate-500">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.success || 0}</p>
                <p className="text-xs text-slate-500">Success</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Timer className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {formatDuration(metrics?.avgDurationMs || null)}
                </p>
                <p className="text-xs text-slate-500">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All providers</SelectItem>
            {metrics && Object.keys(metrics.byProvider).map((p) => (
              <SelectItem key={p} value={p} className="text-slate-300">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as BuildQueueItemStatus); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All statuses</SelectItem>
            <SelectItem value="pending" className="text-slate-300">Pending</SelectItem>
            <SelectItem value="running" className="text-slate-300">Running</SelectItem>
            <SelectItem value="success" className="text-slate-300">Success</SelectItem>
            <SelectItem value="failed" className="text-slate-300">Failed</SelectItem>
            <SelectItem value="cancelled" className="text-slate-300">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {(providerFilter || statusFilter) && (
          <Button
            variant="ghost"
            onClick={() => { setProviderFilter(""); setStatusFilter(""); }}
            className="text-slate-400 hover:text-slate-100"
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Build</TableHead>
              <TableHead className="text-slate-400">Provider</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Branch</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Duration</TableHead>
              <TableHead className="text-slate-400">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {builds.length > 0 ? (
              builds.map((build) => (
                <TableRow key={build.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <span className="font-medium text-slate-200">{build.name}</span>
                    {build.commitSha && (
                      <p className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
                        {build.commitSha.slice(0, 7)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 capitalize">
                      {build.cicdProvider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {build.assignedProjectId ? (
                      <Link href={`/projects/${build.assignedProjectId}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 text-sm">
                        <FolderKanban className="h-3 w-3" />
                        {build.projectName || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {build.branch ? (
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {build.branch}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[build.status]}>
                      <span className="flex items-center gap-1">
                        {statusIcons[build.status]}
                        {build.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {formatDuration(build.durationMs)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {build.receivedAt
                      ? format(new Date(build.receivedAt), "MMM d, HH:mm")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No builds found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
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
