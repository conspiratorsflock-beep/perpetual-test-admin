"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getErrorLogs,
  exportErrorLogsToCSV,
  purgeOldErrors,
} from "@/lib/actions/error-logs";
import type { AdminErrorLog } from "@/types/admin";

const levelConfig = {
  error: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<AdminErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [errorType, setErrorType] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, [errorType]);

  async function loadLogs() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getErrorLogs({
        limit: 100,
        errorType: errorType === "all" ? undefined : errorType,
        search: filter || undefined,
      });
      setLogs(result.logs);
      setTotal(result.count);
    } catch (err) {
      console.error("Failed to load logs:", err);
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  }

  const handleExport = async () => {
    try {
      const csv = await exportErrorLogsToCSV({
        errorType: errorType === "all" ? undefined : errorType,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `error-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export logs:", err);
      alert("Failed to export logs");
    }
  };

  const handlePurge = async () => {
    if (!confirm("Delete all error logs older than 30 days? This cannot be undone.")) return;
    try {
      const result = await purgeOldErrors(30);
      alert(`Deleted ${result.deleted} old error logs`);
      loadLogs();
    } catch (err) {
      console.error("Failed to purge logs:", err);
      alert("Failed to purge logs");
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      (log.path?.toLowerCase() || "").includes(filter.toLowerCase())
  );

  // Get unique error types for filter
  const errorTypes = Array.from(new Set(logs.map((l) => l.errorType)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">System Logs</h1>
          <p className="mt-1 text-sm text-slate-400">
            Error aggregation and application logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLogs} className="border-slate-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} className="border-slate-700">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handlePurge}
            className="border-red-800 text-red-400 hover:bg-red-950/30"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Old
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm bg-slate-900 border-slate-700"
        />
        <Select value={errorType} onValueChange={setErrorType}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700">
            <SelectValue placeholder="Error Type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all">All Types</SelectItem>
            {errorTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-slate-500">
        <span>Total: {total}</span>
        <span>Showing: {filteredLogs.length}</span>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const level =
              log.errorType === "api_error" || log.errorType === "db_error" || log.errorType === "auth_error"
                ? "error"
                : log.errorType === "warning"
                ? "warn"
                : "info";
            const LevelIcon = levelConfig[level].icon;
            return (
              <Card key={log.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-8 w-8 rounded flex items-center justify-center ${levelConfig[level].bg}`}
                    >
                      <LevelIcon className={`h-4 w-4 ${levelConfig[level].color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-200">{log.message}</span>
                        <Badge
                          variant="outline"
                          className={`${levelConfig[level].bg} ${levelConfig[level].color} ${levelConfig[level].border}`}
                        >
                          {log.errorType}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {log.path && (
                          <code className="bg-slate-800 px-1.5 py-0.5 rounded">{log.path}</code>
                        )}
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                        {log.userId && <span>User: {log.userId}</span>}
                        {log.orgId && <span>Org: {log.orgId}</span>}
                      </div>
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="mt-2 p-2 rounded bg-slate-950 text-xs text-slate-500 overflow-x-auto">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                      {Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer">
                            Metadata
                          </summary>
                          <pre className="mt-2 p-2 rounded bg-slate-950 text-xs text-slate-500 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-8 w-8 mx-auto mb-3 text-slate-700" />
              <p>No logs found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
