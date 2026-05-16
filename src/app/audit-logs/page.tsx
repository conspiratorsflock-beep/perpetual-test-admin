"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  Tag,
  Eye,
  EyeOff,
  Building2,
  FolderKanban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { searchLatheAuditLogs, getLatheAuditResourceTypes } from "@/lib/actions/lathe-audit";
import type { LatheAuditLog } from "@/types/admin";

const PAGE_SIZE = 50;

function tryParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LatheAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, types] = await Promise.all([
        searchLatheAuditLogs({
          resourceType: resourceTypeFilter || undefined,
          action: actionFilter || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        getLatheAuditResourceTypes(),
      ]);
      setLogs(result.logs);
      setTotal(result.total);
      setResourceTypes(types);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [resourceTypeFilter, actionFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-400">
          App-level audit trail from Lathe Studio operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ScrollText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{total}</p>
                <p className="text-xs text-slate-500">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Tag className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{resourceTypes.length}</p>
                <p className="text-xs text-slate-500">Resource Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {logs.filter((l) => {
                    const d = new Date(l.createdAt);
                    const now = new Date();
                    return d.toDateString() === now.toDateString();
                  }).length}
                </p>
                <p className="text-xs text-slate-500">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={resourceTypeFilter} onValueChange={(v) => { setResourceTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All resource types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All resource types</SelectItem>
            {resourceTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-slate-300">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-[200px] bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
        />
        {(resourceTypeFilter || actionFilter) && (
          <Button
            variant="ghost"
            onClick={() => { setResourceTypeFilter(""); setActionFilter(""); }}
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
              <TableHead className="text-slate-400">Time</TableHead>
              <TableHead className="text-slate-400">Resource</TableHead>
              <TableHead className="text-slate-400">Action</TableHead>
              <TableHead className="text-slate-400">User</TableHead>
              <TableHead className="text-slate-400">Org</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400 w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <>
                  <TableRow key={log.id} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs w-fit">
                          {log.resourceType}
                        </Badge>
                        <span className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
                          {log.resourceId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{log.action}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {log.userId ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <Link href={`/users/${log.userId}`} className="hover:text-amber-400">
                            {log.userId.slice(0, 8)}…
                          </Link>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {log.orgId ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <Link href={`/organizations/${log.orgId}`} className="hover:text-amber-400">
                            {log.orgId.slice(0, 8)}…
                          </Link>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {log.projectId ? (
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          <Link href={`/projects/${log.projectId}`} className="hover:text-amber-400">
                            {log.projectId.slice(0, 8)}…
                          </Link>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-300"
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      >
                        {expandedLogId === log.id ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedLogId === log.id && (
                    <TableRow className="border-slate-800 bg-slate-950">
                      <TableCell colSpan={7} className="py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.oldValue && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Old Value</p>
                              <pre className="text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-auto max-h-40">
                                {JSON.stringify(tryParseJson(log.oldValue), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">New Value</p>
                              <pre className="text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-auto max-h-40">
                                {JSON.stringify(tryParseJson(log.newValue), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-medium text-slate-500 mb-1">Metadata</p>
                              <pre className="text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-auto max-h-40">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No audit logs found."}
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
