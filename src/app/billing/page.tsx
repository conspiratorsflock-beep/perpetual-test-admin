"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CreditCard,
  TrendingUp,
  Users,
  Receipt,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BillingMetrics } from "@/types/admin";

// Mock data - would come from Stripe in production
const mockMetrics: BillingMetrics = {
  mrr: 45230,
  arr: 542760,
  activeSubscriptions: 142,
  trialingSubscriptions: 12,
  pastDueSubscriptions: 3,
  canceledSubscriptions: 8,
  churnRate: 2.4,
  averageRevenuePerUser: 318,
};

const mrrData = [
  { month: "Jan", mrr: 35000 },
  { month: "Feb", mrr: 38000 },
  { month: "Mar", mrr: 41000 },
  { month: "Apr", mrr: 39500 },
  { month: "May", mrr: 42000 },
  { month: "Jun", mrr: 45230 },
];

const invoices = [
  { id: "inv_1", customer: "Acme Corp", amount: 299, status: "paid", date: "2024-03-01" },
  { id: "inv_2", customer: "TechStart Inc", amount: 99, status: "paid", date: "2024-03-02" },
  { id: "inv_3", customer: "Global Solutions", amount: 599, status: "open", date: "2024-03-03" },
  { id: "inv_4", customer: "Digital Agency", amount: 199, status: "paid", date: "2024-03-04" },
];

const coupons = [
  { id: "coupon_1", code: "WELCOME20", discount: "20% off", status: "active", redemptions: 45 },
  { id: "coupon_2", code: "ENTERPRISE50", discount: "$500 off", status: "active", redemptions: 12 },
];

export default function BillingPage() {
  const [metrics] = useState<BillingMetrics>(mockMetrics);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Billing Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Revenue metrics, invoices, and subscription overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-100">
                ${metrics.mrr.toLocaleString()}
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              ARR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-100">
                ${metrics.arr.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <Users className="h-3 w-3" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-100">
                {metrics.activeSubscriptions}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-100">
                {metrics.churnRate}%
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Good
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MRR Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">MRR Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" fontSize={12} />
                <YAxis stroke="#475569" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "6px",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#mrrGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="invoices" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            <Receipt className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="coupons" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            <Tag className="mr-2 h-4 w-4" />
            Coupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Customer</TableHead>
                    <TableHead className="text-slate-400">Amount</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-800">
                      <TableCell className="text-slate-200">{inv.customer}</TableCell>
                      <TableCell className="text-slate-300">${inv.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "paid"
                              ? "border-emerald-500/30 text-emerald-400"
                              : "border-amber-500/30 text-amber-400"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{inv.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Code</TableHead>
                    <TableHead className="text-slate-400">Discount</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Redemptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} className="border-slate-800">
                      <TableCell>
                        <code className="bg-slate-800 px-2 py-1 rounded text-sm text-slate-300">
                          {coupon.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-slate-300">{coupon.discount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-400"
                        >
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{coupon.redemptions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
