"use client";

import { useState, useCallback } from "react";
import { useVisiblePolling } from "@/lib/hooks/use-visible-polling";
import Link from "next/link";
import { format } from "date-fns";
import {
  Container,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Timer,
  FolderKanban,
  Tag,
  ExternalLink,
  PlayCircle,
  CircleDashed,
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
import { searchBuilds, getBuildMetrics } from "@/lib/actions/builds";
import type { Build, BuildStatus } from "@/types/admin";

const PAGE_SIZE = 25;

const statusIcons: Record<BuildStatus, React.ReactNode> = {
  planned: <CircleDashed className="h-4 w-4 text-slate-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  cancelled: <XCircle className="h-4 w-4 text-slate-400" />,
};

const statusColors: Record<BuildStatus, string> = {
  planned: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const ms = e - s;
  if (ms <= 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, HH:mm");
}

export default function BuildsPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BuildStatus | "">("");
  const [metrics, setMetrics] = useState<{
    total: number;
    planned: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    avgDurationMs: number;
    bySource: Record<string, number>;
    byProvider: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, m] = await Promise.all([
        searchBuilds({
          source: sourceFilter || undefined,
          status: (statusFilter as BuildStatus) || undefined,
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
  }, [sourceFilter, statusFilter, page]);

  useVisiblePolling(fetchData, 30000);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const allSources = metrics ? Object.keys(metrics.bySource) : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-100">Builds</h1>
          {isLoading && builds.length > 0 && (
            <span className="text-xs text-slate-500 animate-pulse">Refreshing...</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Monitor CI/CD builds and manual test runs across all projects.
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
                <CircleDashed className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.planned || 0}</p>
                <p className="text-xs text-slate-500">Planned</p>
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
                <p className="text-2xl font-semibold text-slate-100">{metrics?.completed || 0}</p>
                <p className="text-xs text-slate-500">Completed</p>
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
                  {metrics?.avgDurationMs
                    ? formatDuration("1970-01-01T00:00:00.000Z", new Date(metrics.avgDurationMs).toISOString())
                    : "—"}
                </p>
                <p className="text-xs text-slate-500">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All sources</SelectItem>
            {allSources.map((s) => (
              <SelectItem key={s} value={s} className="text-slate-300 capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as BuildStatus); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All statuses</SelectItem>
            <SelectItem value="planned" className="text-slate-300">Planned</SelectItem>
            <SelectItem value="running" className="text-slate-300">Running</SelectItem>
            <SelectItem value="completed" className="text-slate-300">Completed</SelectItem>
            <SelectItem value="failed" className="text-slate-300">Failed</SelectItem>
            <SelectItem value="cancelled" className="text-slate-300">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {(sourceFilter || statusFilter) && (
          <Button
            variant="ghost"
            onClick={() => { setSourceFilter(""); setStatusFilter(""); }}
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
              <TableHead className="text-slate-400">Source</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Release</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Duration</TableHead>
              <TableHead className="text-slate-400">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {builds.length > 0 ? (
              builds.map((build) => (
                <TableRow key={build.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <span className="font-medium text-slate-200">{build.name}</span>
                    {build.cicdExternalId && (
                      <p className="text-xs text-slate-500 font-mono truncate max-w-[160px]">
                        {build.cicdExternalId}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="border-slate-700 text-slate-400 capitalize text-xs">
                        {build.source}
                      </Badge>
                      {build.cicdProvider && (
                        <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                          {build.cicdProvider}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {build.projectId ? (
                      <Link href={`/projects/${build.projectId}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 text-sm">
                        <FolderKanban className="h-3 w-3" />
                        {build.projectName || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {build.releaseId ? (
                      <span className="flex items-center gap-1 text-slate-300 text-sm">
                        <Tag className="h-3 w-3" />
                        {build.releaseName || "Unknown"}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
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
                    {formatDuration(build.startDate, build.endDate)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {formatDateTime(build.startDate)}
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
