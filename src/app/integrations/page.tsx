"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plug,
  ChevronLeft,
  ChevronRight,
  Unplug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  FolderKanban,
  Building2,
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
import { searchIntegrations, disconnectIntegration, getIntegrationMetrics } from "@/lib/actions/integrations";
import type { IntegrationHealth } from "@/types/admin";

const PAGE_SIZE = 25;

const statusIcons: Record<string, React.ReactNode> = {
  connected: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  active: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
  disconnected: <Unplug className="h-4 w-4 text-slate-400" />,
  refreshing: <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />,
  pending: <HelpCircle className="h-4 w-4 text-slate-400" />,
};

const statusColors: Record<string, string> = {
  connected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  disconnected: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  refreshing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pending: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [metrics, setMetrics] = useState<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    errors: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, m] = await Promise.all([
        searchIntegrations({
          provider: providerFilter || undefined,
          status: statusFilter || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        getIntegrationMetrics(),
      ]);
      setIntegrations(result.integrations);
      setTotal(result.total);
      setMetrics(m);
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [providerFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDisconnect = async (integration: IntegrationHealth) => {
    if (!confirm(`Disconnect ${integration.provider} integration?`)) return;
    try {
      await disconnectIntegration(integration.id, integration.type);
      setIntegrations(integrations.filter((i) => i.id !== integration.id));
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect integration.");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const allProviders = metrics
    ? Object.entries(metrics.byType).map(([k]) => k)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Integrations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor CI/CD, Slack, Teams, Jira, and Azure DevOps connections.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Plug className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.total || 0}</p>
                <p className="text-xs text-slate-500">Total</p>
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
                <p className="text-2xl font-semibold text-slate-100">
                  {(metrics?.byStatus?.connected || 0) + (metrics?.byStatus?.active || 0)}
                </p>
                <p className="text-xs text-slate-500">Healthy</p>
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
                <p className="text-2xl font-semibold text-slate-100">{metrics?.errors || 0}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {metrics?.byStatus?.disconnected || 0}
                </p>
                <p className="text-xs text-slate-500">Disconnected</p>
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
            {allProviders.map((p) => (
              <SelectItem key={p} value={p} className="text-slate-300 capitalize">{p.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All statuses</SelectItem>
            <SelectItem value="connected" className="text-slate-300">Connected</SelectItem>
            <SelectItem value="error" className="text-slate-300">Error</SelectItem>
            <SelectItem value="disconnected" className="text-slate-300">Disconnected</SelectItem>
            <SelectItem value="refreshing" className="text-slate-300">Refreshing</SelectItem>
            <SelectItem value="pending" className="text-slate-300">Pending</SelectItem>
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
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Last Sync</TableHead>
              <TableHead className="text-slate-400 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.length > 0 ? (
              integrations.map((integration) => (
                <TableRow key={integration.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <span className="font-medium text-slate-200 capitalize">
                      {integration.provider.replace("_", " ")}
                    </span>
                    {integration.externalId && (
                      <p className="text-xs text-slate-500">{integration.externalId}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs capitalize">
                      {integration.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {integration.orgId ? (
                      <Link href={`/organizations/${integration.orgId}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 text-sm">
                        <Building2 className="h-3 w-3" />
                        {integration.orgName || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {integration.projectId ? (
                      <Link href={`/projects/${integration.projectId}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 text-sm">
                        <FolderKanban className="h-3 w-3" />
                        {integration.projectName || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[integration.status] || "border-slate-700 text-slate-400"}>
                      <span className="flex items-center gap-1">
                        {statusIcons[integration.status] || <HelpCircle className="h-4 w-4 text-slate-400" />}
                        {integration.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {integration.lastSyncAt
                      ? format(new Date(integration.lastSyncAt), "MMM d, HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDisconnect(integration)}
                    >
                      <Unplug className="h-4 w-4" />
                    </Button>
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
