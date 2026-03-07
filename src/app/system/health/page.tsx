"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HeartPulse,
  Database,
  CreditCard,
  Shield,
  Globe,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { runHealthChecks, getLatestHealthStatus } from "@/lib/actions/system-health";
import type { SystemHealthCheck, ServiceStatus } from "@/types/admin";

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
  },
  degraded: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
  down: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
  },
};

const serviceIcons: Record<string, React.ElementType> = {
  "Supabase Database": Database,
  "Clerk Auth": Shield,
  "Stripe API": CreditCard,
  "Main App": Globe,
};

export default function SystemHealthPage() {
  const [services, setServices] = useState<SystemHealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealthStatus();
  }, []);

  async function loadHealthStatus() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLatestHealthStatus();
      setServices(data);
    } catch (err) {
      console.error("Failed to load health status:", err);
      setError(err instanceof Error ? err.message : "Failed to load health status");
    } finally {
      setIsLoading(false);
    }
  }

  const runCheck = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const results = await runHealthChecks();
      // Convert results to SystemHealthCheck format
      const checks: SystemHealthCheck[] = results.map((r) => ({
        id: Math.random().toString(36), // Temporary ID
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

  const downServices = services.filter((s) => s.status === "down");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">System Health</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor the status of all connected services.
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
          {isChecking ? "Checking..." : "Run Check"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overall Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full ${overallConfig.bg} flex items-center justify-center`}>
              <OverallIcon className={`h-6 w-6 ${overallConfig.color}`} />
            </div>
            <div>
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
          </div>
        </CardContent>
      </Card>

      {/* Down Services Alert */}
      {downServices.length > 0 && (
        <Alert className="bg-red-900/20 border-red-800">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            {downServices.length} service(s) currently down:{' '}
            {downServices.map((s) => s.serviceName).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => {
            const StatusIcon = statusConfig[service.status].icon;
            const ServiceIcon = serviceIcons[service.serviceName] || Globe;
            return (
              <Card key={service.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                        <ServiceIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-200">{service.serviceName}</h3>
                        <p className="text-xs text-slate-500">
                          {service.latencyMs !== null ? `${service.latencyMs}ms latency` : "No data"}
                        </p>
                        {service.errorMessage && (
                          <p className="text-xs text-red-400 mt-1">{service.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusConfig[service.status].bg} ${statusConfig[service.status].color} ${statusConfig[service.status].border}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {service.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && services.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <HeartPulse className="h-12 w-12 mx-auto mb-4 text-slate-700" />
            <p className="text-slate-500">No health checks recorded yet.</p>
            <p className="text-sm text-slate-600 mt-1">Click "Run Check" to start monitoring.</p>
          </CardContent>
        </Card>
      )}

      {/* Latency Chart Placeholder */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Response Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed border-slate-800 rounded-lg">
            <p className="text-sm text-slate-500">Historical latency charts coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
