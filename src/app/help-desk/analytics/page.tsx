"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getSupportAnalytics, getTicketVolumeData, getAgentLeaderboard } from "@/lib/actions/support-tickets";

const RANGE_OPTIONS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
];

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export default function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getSupportAnalytics>> | null>(null);
  const [volume, setVolume] = useState<Awaited<ReturnType<typeof getTicketVolumeData>>>([]);
  const [agents, setAgents] = useState<Awaited<ReturnType<typeof getAgentLeaderboard>>>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange(days);
      const [a, v, ag] = await Promise.all([
        getSupportAnalytics(range),
        getTicketVolumeData(range),
        getAgentLeaderboard(range),
      ]);
      setAnalytics(a);
      setVolume(v);
      setAgents(ag);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(rangeDays);
  }, [rangeDays]);

  const chartData = useMemo(() => {
    return volume.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [volume]);

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-blue-500",
    low: "bg-slate-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
          <p className="text-slate-400">Metrics, SLA performance, and volume trends</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-700 bg-slate-800 overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`px-3 py-1.5 text-sm ${
                  rangeDays === opt.days
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(rangeDays)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "—" : analytics?.totalTickets ?? 0}
                </div>
                <div className="text-sm text-slate-400">Total Tickets</div>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "—" : analytics?.openTickets ?? 0}
                </div>
                <div className="text-sm text-slate-400">Open Tickets</div>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "—" : formatDuration(analytics?.avgResponseTimeMinutes ?? 0)}
                </div>
                <div className="text-sm text-slate-400">Avg Response</div>
              </div>
              <Clock className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "—" : `${analytics?.slaCompliancePct ?? 0}%`}
                </div>
                <div className="text-sm text-slate-400">SLA Compliance</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "—" : formatDuration(analytics?.avgResolutionTimeMinutes ?? 0)}
                </div>
                <div className="text-sm text-slate-400">Avg Resolution</div>
              </div>
              <Clock className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="volume">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger
            value="volume"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Volume
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  No tickets in selected period
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          color: "#f1f5f9",
                        }}
                      />
                      <Bar dataKey="created" name="Created" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  </div>
                ) : !analytics || Object.keys(analytics.byStatus).length === 0 ? (
                  <div className="text-slate-500 text-sm">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.byStatus)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <Badge
                            variant={
                              status === "resolved" || status === "closed"
                                ? "default"
                                : status === "open"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {status}
                          </Badge>
                          <span className="text-slate-100 font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  </div>
                ) : !analytics || Object.keys(analytics.byPriority).length === 0 ? (
                  <div className="text-slate-500 text-sm">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.byPriority)
                      .sort(([, a], [, b]) => b - a)
                      .map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                priorityColors[priority] || "bg-slate-500"
                              }`}
                            />
                            <span className="text-slate-300 capitalize">{priority}</span>
                          </div>
                          <span className="font-medium text-slate-100">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  </div>
                ) : !analytics || Object.keys(analytics.byCategory).length === 0 ? (
                  <div className="text-slate-500 text-sm">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.byCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-slate-300 capitalize">{category.replace(/_/g, " ")}</span>
                          <span className="font-medium text-slate-100">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">SLA Compliance</span>
                        <span className="text-slate-100">{analytics?.slaCompliancePct ?? 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${Math.min(analytics?.slaCompliancePct || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="text-2xl font-bold text-slate-100">
                          {formatDuration(analytics?.avgResponseTimeMinutes ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500">Avg First Response</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-100">
                          {formatDuration(analytics?.avgResolutionTimeMinutes ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500">Avg Resolution</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-32 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                </div>
              ) : agents.length === 0 ? (
                <div className="text-slate-500 text-sm">No team members found</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {agents.map((agent, i) => (
                    <div
                      key={agent.userId}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-400 shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-slate-100 block truncate">
                            {agent.name}
                          </span>
                          <span className="text-xs text-slate-500 truncate block">{agent.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-slate-100 font-medium">{agent.resolved}</div>
                          <div className="text-slate-500 text-xs">Resolved</div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-100 font-medium">
                            {formatDuration(agent.avgResolutionMinutes)}
                          </div>
                          <div className="text-slate-500 text-xs">Avg Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-400 font-medium">{agent.openAssigned}</div>
                          <div className="text-slate-500 text-xs">Open</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
