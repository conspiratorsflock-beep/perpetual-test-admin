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
  Loader2,
  AlertCircle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BillingMetrics, StripeInvoice, StripeCoupon } from "@/types/admin";
import {
  getBillingMetrics,
  getRecentInvoices,
  getActiveCoupons,
  getMRRHistory,
} from "@/lib/actions/billing";

interface MRRDataPoint {
  month: string;
  mrr: number;
}

export default function BillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [coupons, setCoupons] = useState<StripeCoupon[]>([]);
  const [mrrData, setMrrData] = useState<MRRDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBillingData() {
      try {
        setIsLoading(true);
        setError(null);

        const [metricsData, invoicesData, couponsData, mrrHistory] = await Promise.all([
          getBillingMetrics(),
          getRecentInvoices(),
          getActiveCoupons(),
          getMRRHistory(),
        ]);

        setMetrics(metricsData);
        setInvoices(invoicesData);
        setCoupons(couponsData);
        setMrrData(mrrHistory);
      } catch (err) {
        console.error("Failed to load billing data:", err);
        setError(err instanceof Error ? err.message : "Failed to load billing data");
      } finally {
        setIsLoading(false);
      }
    }

    loadBillingData();
  }, []);

  // Calculate MRR growth
  const mrrGrowth =
    mrrData.length >= 2 && mrrData[mrrData.length - 2].mrr > 0
      ? ((mrrData[mrrData.length - 1].mrr - mrrData[mrrData.length - 2].mrr) /
          mrrData[mrrData.length - 2].mrr) *
        100
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-900/20 border-red-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert className="bg-amber-900/20 border-amber-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No billing data available</AlertDescription>
      </Alert>
    );
  }

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
              <Badge
                className={
                  mrrGrowth >= 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }
              >
                {mrrGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(mrrGrowth).toFixed(1)}%
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
              {metrics.trialingSubscriptions > 0 && (
                <span className="text-xs text-slate-500">
                  +{metrics.trialingSubscriptions} trialing
                </span>
              )}
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
              <Badge
                className={
                  metrics.churnRate <= 5
                    ? "bg-emerald-500/20 text-emerald-400"
                    : metrics.churnRate <= 10
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
                }
              >
                {metrics.churnRate <= 5 ? "Good" : metrics.churnRate <= 10 ? "Fair" : "High"}
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
                <YAxis
                  stroke="#475569"
                  fontSize={12}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
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
          <TabsTrigger
            value="invoices"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="coupons"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
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
                      <TableCell className="text-slate-200">{inv.customerName}</TableCell>
                      <TableCell className="text-slate-300">
                        ${(inv.amountPaid / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "paid"
                              ? "border-emerald-500/30 text-emerald-400"
                              : inv.status === "open"
                              ? "border-amber-500/30 text-amber-400"
                              : "border-slate-500/30 text-slate-400"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  )}
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
                    <TableHead className="text-slate-400">Duration</TableHead>
                    <TableHead className="text-slate-400">Redemptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} className="border-slate-800">
                      <TableCell>
                        <code className="bg-slate-800 px-2 py-1 rounded text-sm text-slate-300">
                          {coupon.id}
                        </code>
                        {coupon.name && (
                          <span className="ml-2 text-slate-400">{coupon.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {coupon.percentOff
                          ? `${coupon.percentOff}% off`
                          : coupon.amountOff
                          ? `$${(coupon.amountOff / 100).toFixed(2)} off`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {coupon.duration === "repeating" && coupon.durationInMonths
                          ? `${coupon.durationInMonths} months`
                          : coupon.duration}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {coupon.timesRedeemed}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  {coupons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        No active coupons found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
