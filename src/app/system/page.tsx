"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Database,
  Shield,
  CreditCard,
  Globe,
  Settings,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
  Server,
  Zap,
  Users,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { runHealthChecks, getLatestHealthStatus } from "@/lib/actions/system-health";
import { getErrorLogs } from "@/lib/actions/error-logs";
import { getFeatureFlags } from "@/lib/actions/feature-flags";
import type { SystemHealthCheck, ServiceStatus, AdminErrorLog, FeatureFlag } from "@/types/admin";

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    label: "Operational",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    label: "Degraded",
  },
  down: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    label: "Down",
  },
};

const serviceIcons: Record<string, React.ElementType> = {
  "Supabase Database": Database,
  "Clerk Auth": Shield,
  "Stripe API": CreditCard,
  "Main App": Globe,
};

interface IntegrationStatus {
  name: string;
  icon: React.ElementType;
  status: ServiceStatus;
  description: string;
  configured: boolean;
  lastChecked?: string;
}

export default function SystemDashboardPage() {
  const [services, setServices] = useState<SystemHealthCheck[]>([]);
  const [recentLogs, setRecentLogs] = useState<AdminErrorLog[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    setError(null);
    try {
      const [healthData, logsData, flagsData] = await Promise.all([
        getLatestHealthStatus(),
        getErrorLogs({ limit: 5 }),
        getFeatureFlags(),
      ]);
      setServices(healthData);
      setRecentLogs(logsData.logs);
      setFlags(flagsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }

  const runCheck = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const results = await runHealthChecks();
      const checks: SystemHealthCheck[] = results.map((r) => ({
        id: Math.random().toString(36),
        serviceName: r.name,
        status: r.status,
        latencyMs: r.latency,
        errorMessage: r.message || null,
        checkedAt: new Date().toISOString(),
      }));
      setServices(checks);
    } catch (err) {
      console.error("Failed to run health checks:", err);
      setError(err instanceof Error ? err.message : "Failed to run health checks");
    } finally {
      setIsChecking(false);
    }
  };

  const getOverallStatus = (): ServiceStatus => {
    if (services.length === 0) return "healthy";
    if (services.some((s) => s.status === "down")) return "down";
    if (services.some((s) => s.status === "degraded")) return "degraded";
    return "healthy";
  };

  const overallStatus = getOverallStatus();
  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  // Calculate stats
  const activeFlags = flags.filter((f) => f.enabledGlobally).length;
  const totalFlags = flags.length;
  const errorCount = recentLogs.filter((l) => 
    l.errorType === "api_error" || l.errorType === "db_error" || l.errorType === "auth_error"
  ).length;
  const warningCount = recentLogs.filter((l) => l.errorType === "warning").length;

  // Integration statuses
  const integrations: IntegrationStatus[] = [
    {
      name: "Supabase Database",
      icon: Database,
      status: services.find((s) => s.serviceName === "Supabase Database")?.status || "healthy",
      description: "Primary data storage",
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      lastChecked: services.find((s) => s.serviceName === "Supabase Database")?.checkedAt,
    },
    {
      name: "Clerk Authentication",
      icon: Shield,
      status: services.find((s) => s.serviceName === "Clerk Auth")?.status || "healthy",
      description: "User authentication & authorization",
      configured: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      lastChecked: services.find((s) => s.serviceName === "Clerk Auth")?.checkedAt,
    },
    {
      name: "Stripe Billing",
      icon: CreditCard,
      status: services.find((s) => s.serviceName === "Stripe API")?.status || "healthy",
      description: "Payment processing & subscriptions",
      configured: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder",
      lastChecked: services.find((s) => s.serviceName === "Stripe API")?.checkedAt,
    },
    {
      name: "Main Application",
      icon: Globe,
      status: services.find((s) => s.serviceName === "Main App")?.status || "healthy",
      description: "Perpetual Test main app",
      configured: !!process.env.NEXT_PUBLIC_MAIN_APP_URL,
      lastChecked: services.find((s) => s.serviceName === "Main App")?.checkedAt,
    },
  ];

  const downServices = services.filter((s) => s.status === "down");
  const degradedServices = services.filter((s) => s.status === "degraded");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">System Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview of system health, integrations, and status.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={runCheck}
          disabled={isChecking}
          className="border-slate-700"
        >
          {isChecking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isChecking ? "Checking..." : "Run Health Check"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overall Status Card */}
      <Card className={`bg-slate-900 ${overallConfig.border} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full ${overallConfig.bg} flex items-center justify-center`}>
              <OverallIcon className={`h-7 w-7 ${overallConfig.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-100">
                {overallStatus === "healthy" && "All Systems Operational"}
                {overallStatus === "degraded" && "Some Systems Degraded"}
                {overallStatus === "down" && "Some Systems Down"}
              </h2>
              <p className="text-sm text-slate-400">
                {services.length > 0
                  ? `Last checked ${formatDistanceToNow(new Date(services[0].checkedAt), {
                      addSuffix: true,
                    })}`
                  : "No health checks run yet"}
              </p>
            </div>
            <div className="flex gap-2">
              {downServices.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {downServices.length} Down
                </Badge>
              )}
              {degradedServices.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {degradedServices.length} Degraded
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {services.filter((s) => s.status === "healthy").length}
                </p>
                <p className="text-xs text-slate-500">Healthy Services</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{activeFlags}</p>
                <p className="text-xs text-slate-500">Active Feature Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{errorCount}</p>
                <p className="text-xs text-slate-500">Recent Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{integrations.length}</p>
                <p className="text-xs text-slate-500">Integrations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations Status */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Integrations
            </CardTitle>
            <CardDescription className="text-slate-500">
              Status of connected third-party services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.map((integration) => {
              const StatusIcon = statusConfig[integration.status].icon;
              const IntegrationIcon = integration.icon;
              return (
                <div
                  key={integration.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                      <IntegrationIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{integration.name}</p>
                      <p className="text-xs text-slate-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!integration.configured && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                        Not Configured
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`${statusConfig[integration.status].bg} ${statusConfig[integration.status].color} ${statusConfig[integration.status].border}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[integration.status].label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Errors
              </CardTitle>
              <CardDescription className="text-slate-500">
                Latest system errors and warnings
              </CardDescription>
            </div>
            <Link href="/system/logs">
              <Button variant="ghost" size="sm" className="text-slate-400">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                <p>No recent errors</p>
              </div>
            ) : (
              recentLogs.slice(0, 5).map((log) => {
                const isError = log.errorType === "api_error" || log.errorType === "db_error" || log.errorType === "auth_error";
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950"
                  >
                    <div className={`h-8 w-8 rounded flex items-center justify-center ${isError ? "bg-red-500/20" : "bg-amber-500/20"}`}>
                      {isError ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{log.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-500">
                          {log.errorType}
                        </Badge>
                        <span className="text-xs text-slate-600">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags Summary */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Feature Flags
            </CardTitle>
            <CardDescription className="text-slate-500">
              Active feature flags and rollout status
            </CardDescription>
          </div>
          <Link href="/support/flags">
            <Button variant="ghost" size="sm" className="text-slate-400">
              Manage Flags
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Active Flags</span>
              <span className="text-slate-200 font-medium">
                {activeFlags} of {totalFlags}
              </span>
            </div>
            <Progress 
              value={totalFlags > 0 ? (activeFlags / totalFlags) * 100 : 0} 
              className="h-2 bg-slate-800"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {flags.slice(0, 4).map((flag) => (
                <div
                  key={flag.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${flag.enabledGlobally ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <span className="text-sm text-slate-300 truncate">{flag.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{flag.key}</p>
                </div>
              ))}
              {flags.length === 0 && (
                <p className="text-slate-500 text-sm col-span-4 text-center py-4">
                  No feature flags configured
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/system/health">
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-200">Health Checks</p>
                <p className="text-xs text-slate-500">Detailed service monitoring</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/system/config">
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-200">Configuration</p>
                <p className="text-xs text-slate-500">Environment & settings</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/system/logs">
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-200">System Logs</p>
                <p className="text-xs text-slate-500">Error tracking & analytics</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
