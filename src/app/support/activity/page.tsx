"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Activity, Filter, RefreshCw, Download, FileJson, FileSpreadsheet } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuditLogs } from "@/lib/audit/logger";
import { exportAuditLogsToCSV, exportAuditLogsToJSON } from "@/lib/actions/audit-export";
import type { AuditLog, AuditTargetType } from "@/types/admin";

const targetTypeLabels: Record<AuditTargetType, string> = {
  user: "User",
  organization: "Organization",
  project: "Project",
  feature_flag: "Feature Flag",
  system: "System",
  billing: "Billing",
  announcement: "Announcement",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{
    targetType?: AuditTargetType;
    adminId?: string;
    action?: string;
  }>({});

  useEffect(() => {
    loadLogs();
  }, [filter]);

  async function loadLogs() {
    setIsLoading(true);
    try {
      const result = await getAuditLogs({
        limit: 100,
        targetType: filter.targetType,
        adminId: filter.adminId,
        action: filter.action,
      });
      setLogs(result.logs);
      setTotal(result.count);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExportCSV = async () => {
    try {
      const csv = await exportAuditLogsToCSV({
        targetType: filter.targetType,
        adminId: filter.adminId,
        action: filter.action,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("Failed to export logs");
    }
  };

  const handleExportJSON = async () => {
    try {
      const json = await exportAuditLogsToJSON({
        targetType: filter.targetType,
        adminId: filter.adminId,
        action: filter.action,
      });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("Failed to export logs");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Activity Log</h1>
          <p className="mt-1 text-sm text-slate-400">
            Global audit trail of all admin actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLogs} className="border-slate-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-700">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800">
              <DropdownMenuItem onClick={handleExportCSV} className="text-slate-300">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="text-slate-300">
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">Filters:</span>
            </div>
            <Select
              value={filter.targetType || "all"}
              onValueChange={(v) =>
                setFilter((f) => ({
                  ...f,
                  targetType: v === "all" ? undefined : (v as AuditTargetType),
                }))
              }
            >
              <SelectTrigger className="w-40 bg-slate-950 border-slate-800">
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(targetTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filter by action..."
              value={filter.action || ""}
              onChange={(e) =>
                setFilter((f) => ({ ...f, action: e.target.value || undefined }))
              }
              className="w-48 bg-slate-950 border-slate-800"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter({})}
              className="text-slate-400"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="text-sm text-slate-500">
        Showing {logs.length} of {total} entries
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-200">{log.action}</span>
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-slate-400 text-xs"
                      >
                        {targetTypeLabels[log.targetType]}
                      </Badge>
                      {log.targetName && (
                        <span className="text-slate-500">on {log.targetName}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>by {log.adminEmail}</span>
                      <span>•</span>
                      <span>{format(new Date(log.createdAt), "PP p")}</span>
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 p-2 rounded bg-slate-950 text-xs">
                        <pre className="text-slate-500 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-500">No activity found.</div>
          )}
        </div>
      )}
    </div>
  );
}
