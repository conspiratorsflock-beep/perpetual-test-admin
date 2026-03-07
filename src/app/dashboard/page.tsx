"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTotalUserCount } from "@/lib/actions/users";
import { getTotalOrgCount } from "@/lib/actions/organizations";
import type { StatCard } from "@/types/admin";

// Placeholder sparkline data
const sparkData = [
  { v: 40 }, { v: 45 }, { v: 42 }, { v: 50 }, { v: 55 },
  { v: 52 }, { v: 60 }, { v: 58 }, { v: 65 }, { v: 70 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([
    { label: "Total Users", value: "—", change: "—", trend: "neutral" },
    { label: "Active Orgs", value: "—", change: "—", trend: "neutral" },
    { label: "MRR", value: "$45,230", change: "+12%", trend: "up" },
    { label: "API Calls Today", value: "—", change: "—", trend: "neutral" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [userCount, orgCount] = await Promise.all([
          getTotalUserCount(),
          getTotalOrgCount(),
        ]);

        setStats([
          { label: "Total Users", value: userCount.toLocaleString(), change: "—", trend: "neutral" },
          { label: "Active Orgs", value: orgCount.toLocaleString(), change: "—", trend: "neutral" },
          { label: "MRR", value: "$45,230", change: "+12%", trend: "up" },
          { label: "API Calls Today", value: "—", change: "—", trend: "neutral" },
        ]);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const statIcons = [Users, Building2, CreditCard, Zap];

  function StatCardComponent({
    stat,
    index,
  }: {
    stat: StatCard;
    index: number;
  }) {
    const Icon = statIcons[index];
    const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : null;

    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">{stat.label}</p>
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{stat.value}</p>
          <div className="mt-1 flex items-center gap-1">
            {TrendIcon && (
              <TrendIcon
                className={`h-3 w-3 ${stat.trend === "up" ? "text-emerald-400" : "text-red-400"}`}
              />
            )}
            <p
              className={`text-xs ${
                stat.trend === "up"
                  ? "text-emerald-400"
                  : stat.trend === "down"
                  ? "text-red-400"
                  : "text-slate-500"
              }`}
            >
              {stat.change}
            </p>
          </div>

          {/* Sparkline */}
          <div className="mt-3 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ display: "none" }}
                  cursor={false}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fill={`url(#grad-${index})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of Perpetual Test platform metrics.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCardComponent key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/users">
          <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Users className="h-5 w-5 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">User Management</p>
                    <p className="text-xs text-slate-500">Search, manage, and impersonate users</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/organizations">
          <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Building2 className="h-5 w-5 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">Organizations</p>
                    <p className="text-xs text-slate-500">Manage orgs and billing tiers</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/support/flags">
          <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Zap className="h-5 w-5 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">Feature Flags</p>
                    <p className="text-xs text-slate-500">Control feature rollouts</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Recent Admin Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Activity className="h-8 w-8 mr-3" />
            <p>View activity logs in the Support section</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
