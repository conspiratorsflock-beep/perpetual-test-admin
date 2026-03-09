import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | Help Desk",
};

// Mock data - would be fetched from server actions
const mockStats = {
  totalTickets: 1247,
  openTickets: 23,
  avgResponseTime: "2h 15m",
  slaCompliance: 94,
  csatScore: 4.6,
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
          <p className="text-slate-400">Metrics, SLA performance, and volume trends</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button size="sm">Export Report</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {mockStats.totalTickets}
                </div>
                <div className="text-sm text-slate-400">Total Tickets</div>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
            <div className="mt-2 text-xs text-green-400">+12% vs last month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {mockStats.openTickets}
                </div>
                <div className="text-sm text-slate-400">Open Tickets</div>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500/50" />
            </div>
            <div className="mt-2 text-xs text-slate-500">-5% vs yesterday</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {mockStats.avgResponseTime}
                </div>
                <div className="text-sm text-slate-400">Avg Response</div>
              </div>
              <Clock className="h-8 w-8 text-blue-500/50" />
            </div>
            <div className="mt-2 text-xs text-green-400">-15m vs last week</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {mockStats.slaCompliance}%
                </div>
                <div className="text-sm text-slate-400">SLA Compliance</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
            <div className="mt-2 text-xs text-green-400">+2% vs last month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100">
                  {mockStats.csatScore}
                </div>
                <div className="text-sm text-slate-400">CSAT Score</div>
              </div>
              <Users className="h-8 w-8 text-purple-500/50" />
            </div>
            <div className="mt-2 text-xs text-slate-500">Based on 89 ratings</div>
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
              <CardTitle>Ticket Volume (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Volume chart coming soon</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Integration with Recharts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Time by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { priority: "Urgent", time: "1.5h", color: "bg-red-500" },
                    { priority: "High", time: "4.2h", color: "bg-orange-500" },
                    { priority: "Medium", time: "12h", color: "bg-blue-500" },
                    { priority: "Low", time: "2.5d", color: "bg-slate-500" },
                  ].map((item) => (
                    <div
                      key={item.priority}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${item.color}`}
                        />
                        <span className="text-slate-300">{item.priority}</span>
                      </div>
                      <span className="font-medium text-slate-100">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Met SLA", value: 94, color: "bg-green-500" },
                    { label: "At Risk", value: 4, color: "bg-amber-500" },
                    { label: "Breached", value: 2, color: "bg-red-500" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-slate-100">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
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
              <div className="divide-y divide-slate-800">
                {[
                  { name: "Sarah Johnson", resolved: 45, avgTime: "2h", csat: 4.8 },
                  { name: "Mike Chen", resolved: 38, avgTime: "2.5h", csat: 4.7 },
                  { name: "Alex Rivera", resolved: 32, avgTime: "3h", csat: 4.5 },
                ].map((agent, i) => (
                  <div
                    key={agent.name}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-400">
                        {i + 1}
                      </div>
                      <span className="font-medium text-slate-100">
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-slate-100 font-medium">
                          {agent.resolved}
                        </div>
                        <div className="text-slate-500 text-xs">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-100 font-medium">
                          {agent.avgTime}
                        </div>
                        <div className="text-slate-500 text-xs">Avg Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-medium">
                          {agent.csat}
                        </div>
                        <div className="text-slate-500 text-xs">CSAT</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
