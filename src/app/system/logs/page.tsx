"use client";

import { useState } from "react";
import { FileText, AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react";
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

interface LogEntry {
  id: string;
  level: "error" | "warn" | "info";
  message: string;
  path: string;
  timestamp: string;
  userId?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    level: "error",
    message: "Database connection timeout",
    path: "/api/tests",
    timestamp: "2024-03-06T10:30:00Z",
    userId: "user_123",
  },
  {
    id: "2",
    level: "warn",
    message: "Slow query detected (>1000ms)",
    path: "/api/organizations",
    timestamp: "2024-03-06T10:25:00Z",
  },
  {
    id: "3",
    level: "info",
    message: "User signed in",
    path: "/api/auth/callback",
    timestamp: "2024-03-06T10:20:00Z",
    userId: "user_456",
  },
];

const levelConfig = {
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
};

export default function SystemLogsPage() {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [filter, setFilter] = useState("");

  const filteredLogs = logs.filter(
    (log) =>
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.path.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">System Logs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Error aggregation and application logs.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm bg-slate-900 border-slate-700"
        />
        <Select defaultValue="all">
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="border-slate-700">
          Export
        </Button>
      </div>

      {/* Logs */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const LevelIcon = levelConfig[log.level].icon;
          return (
            <Card key={log.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded flex items-center justify-center ${levelConfig[log.level].bg}`}>
                    <LevelIcon className={`h-4 w-4 ${levelConfig[log.level].color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-200">{log.message}</span>
                      <Badge
                        variant="outline"
                        className={`${levelConfig[log.level].bg} ${levelConfig[log.level].color} ${levelConfig[log.level].border}`}
                      >
                        {log.level}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded">{log.path}</code>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      {log.userId && <span>User: {log.userId}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-slate-500">No logs found.</div>
        )}
      </div>
    </div>
  );
}
