"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupportAnalytics } from "@/lib/actions/support-tickets";
import { subDays, format } from "date-fns";

export function SupportAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [stats, setStats] = useState<{
    totalTickets: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    avgResponseTime: number;
    avgResolutionTime: number;
    satisfactionScore: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(timeRange);
      const endDate = new Date().toISOString();
      const startDate = subDays(new Date(), days).toISOString();
      
      const data = await getSupportAnalytics({ startDate, endDate });
      setStats(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-500",
    pending: "bg-yellow-500",
    in_progress: "bg-amber-500",
    resolved: "bg-green-500",
    closed: "bg-slate-500",
    escalated: "bg-red-500",
  };

  const statusLabels = Object.entries(stats?.byStatus || {}).map(([label, value]) => ({
    label,
    value,
    color: statusColors[label] || "bg-slate-500",
  }));

  const categoryData = Object.entries(stats?.byCategory || {}).map(([label, value]) => ({
    label,
    value,
  }));

  const total = stats?.totalTickets || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Support Analytics</h2>
          <p className="text-slate-400 text-sm">
            Overview of support performance and metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading analytics...</div>
      ) : stats?.totalTickets === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tickets in this time period</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Total Tickets
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {stats?.totalTickets || 0}
                </div>
                <p className="text-xs text-slate-500">In selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Avg Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {stats?.avgResponseTime ? `${stats.avgResponseTime.toFixed(1)}h` : "N/A"}
                </div>
                <p className="text-xs text-slate-500">First response</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Avg Resolution Time
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {stats?.avgResolutionTime ? `${stats.avgResolutionTime.toFixed(1)}h` : "N/A"}
                </div>
                <p className="text-xs text-slate-500">Time to resolve</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  CSAT Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {stats?.satisfactionScore ? `${stats.satisfactionScore}/5` : "N/A"}
                </div>
                <p className="text-xs text-slate-500">Customer satisfaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tickets by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusLabels.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {statusLabels.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-slate-400 capitalize">{item.label.replace("_", " ")}</div>
                        <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full`}
                            style={{
                              width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm text-slate-300">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tickets by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-28 text-sm text-slate-400 capitalize">{item.label.replace("_", " ")}</div>
                        <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm text-slate-300">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
