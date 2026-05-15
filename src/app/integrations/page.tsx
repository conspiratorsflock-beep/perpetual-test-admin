"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plug,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Unplug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
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
import { searchIntegrations, disconnectIntegration, retryIntegrationSync, getIntegrationProviders } from "@/lib/actions/integrations";
import type { IntegrationHealth, IntegrationStatus } from "@/types/admin";

const PAGE_SIZE = 25;

const statusIcons: Record<IntegrationStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  expired: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
  not_configured: <HelpCircle className="h-4 w-4 text-slate-500" />,
};

const statusColors: Record<IntegrationStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  not_configured: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "">("");
  const [providerStats, setProviderStats] = useState<
    { provider: string; total: number; active: number; error: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, stats] = await Promise.all([
        searchIntegrations({
          provider: providerFilter || undefined,
          status: (statusFilter as IntegrationStatus) || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        getIntegrationProviders(),
      ]);
      setIntegrations(result.integrations);
      setTotal(result.total);
      setProviderStats(stats);
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [providerFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Disconnect this integration?")) return;
    setActionError(null);
    try {
      await disconnectIntegration(id);
      fetchData();
    } catch (error) {
      console.error(error);
      setActionError("Failed to disconnect integration.");
    }
  };

  const handleRetry = async (id: string) => {
    setActionError(null);
    try {
      await retryIntegrationSync(id);
      fetchData();
    } catch (error) {
      console.error(error);
      setActionError("Failed to retry integration.");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = integrations.filter((i) => i.status === "active").length;
  const errorCount = integrations.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Integrations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor org and project integration health across all providers.
        </p>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Plug className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{total}</p>
                <p className="text-xs text-slate-500">Total Connections</p>
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
                <p className="text-2xl font-semibold text-slate-100">{activeCount}</p>
                <p className="text-xs text-slate-500">Active</p>
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
                <p className="text-2xl font-semibold text-slate-100">{errorCount}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Plug className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{providerStats.length}</p>
                <p className="text-xs text-slate-500">Providers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All providers</SelectItem>
            {providerStats.map((s) => (
              <SelectItem key={s.provider} value={s.provider} className="text-slate-300">
                {s.provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IntegrationStatus)}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All statuses</SelectItem>
            <SelectItem value="active" className="text-slate-300">Active</SelectItem>
            <SelectItem value="expired" className="text-slate-300">Expired</SelectItem>
            <SelectItem value="error" className="text-slate-300">Error</SelectItem>
            <SelectItem value="not_configured" className="text-slate-300">Not Configured</SelectItem>
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
              <TableHead className="text-slate-400">Provider</TableHead>
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Last Sync</TableHead>
              <TableHead className="text-slate-400">Error</TableHead>
              <TableHead className="text-slate-400 w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.length > 0 ? (
              integrations.map((integration) => (
                <TableRow key={integration.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <span className="font-medium text-slate-200 capitalize">{integration.provider}</span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/organizations/${integration.orgId}`} className="text-slate-300 hover:text-amber-400">
                      {integration.orgName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {integration.projectName || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[integration.status]}>
                      <span className="flex items-center gap-1">
                        {statusIcons[integration.status]}
                        {integration.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {integration.lastSyncAt
                      ? format(new Date(integration.lastSyncAt), "MMM d, HH:mm")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                    {integration.errorMessage || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-emerald-400"
                        onClick={() => handleRetry(integration.id)}
                        title="Retry sync"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-400"
                        onClick={() => handleDisconnect(integration.id)}
                        title="Disconnect"
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No integrations found."}
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
