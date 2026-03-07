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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceStatus } from "@/types/admin";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  lastChecked: Date;
  icon: React.ElementType;
}

export default function SystemHealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: "Supabase Database", status: "healthy", latency: 45, lastChecked: new Date(), icon: Database },
    { name: "Clerk Auth", status: "healthy", latency: 120, lastChecked: new Date(), icon: Shield },
    { name: "Stripe API", status: "healthy", latency: 230, lastChecked: new Date(), icon: CreditCard },
    { name: "Main App", status: "healthy", latency: 85, lastChecked: new Date(), icon: Globe },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    // Simulate health check
    await new Promise((r) => setTimeout(r, 1500));
    setServices((prev) =>
      prev.map((s) => ({
        ...s,
        lastChecked: new Date(),
        latency: Math.floor(Math.random() * 300) + 20,
      }))
    );
    setIsChecking(false);
  };

  const statusConfig = {
    healthy: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
    degraded: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
    down: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  };

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
          onClick={runHealthCheck}
          disabled={isChecking}
          className="border-slate-700"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking..." : "Run Check"}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <HeartPulse className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">All Systems Operational</h2>
              <p className="text-sm text-slate-400">
                Last checked {formatDistanceToNow(services[0].lastChecked, { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const StatusIcon = statusConfig[service.status].icon;
          return (
            <Card key={service.name} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                      <service.icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-200">{service.name}</h3>
                      <p className="text-xs text-slate-500">
                        {service.latency}ms latency
                      </p>
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

      {/* Latency Chart Placeholder */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Response Times (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed border-slate-800 rounded-lg">
            <p className="text-sm text-slate-500">Historical latency data would appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
