"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";
import type { SystemHealthCheck, ServiceStatus } from "@/types/admin";

interface HealthCheckResult {
  name: string;
  status: ServiceStatus;
  latency: number;
  message?: string;
}

/**
 * Check Supabase database health.
 */
async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    // Simple query to check connection
    const { error } = await supabaseAdmin.from("admin_audit_logs").select("id").limit(1);
    const latency = Date.now() - start;

    if (error) {
      return {
        name: "Supabase Database",
        status: "down",
        latency,
        message: error.message,
      };
    }

    return {
      name: "Supabase Database",
      status: latency > 1000 ? "degraded" : "healthy",
      latency,
    };
  } catch (error) {
    return {
      name: "Supabase Database",
      status: "down",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check Clerk health.
 */
async function checkClerkHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const client = await clerkClient();
    await client.users.getUserList({ limit: 1 });
    const latency = Date.now() - start;

    return {
      name: "Clerk Auth",
      status: latency > 2000 ? "degraded" : "healthy",
      latency,
    };
  } catch (error) {
    return {
      name: "Clerk Auth",
      status: "down",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check Stripe health.
 */
async function checkStripeHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await stripe.customers.list({ limit: 1 });
    const latency = Date.now() - start;

    return {
      name: "Stripe API",
      status: latency > 3000 ? "degraded" : "healthy",
      latency,
    };
  } catch (error) {
    return {
      name: "Stripe API",
      status: "down",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check main app health (if configured).
 */
async function checkMainAppHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  const mainAppUrl = process.env.MAIN_APP_URL;

  if (!mainAppUrl) {
    return {
      name: "Main App",
      status: "healthy",
      latency: 0,
      message: "MAIN_APP_URL not configured",
    };
  }

  try {
    const response = await fetch(`${mainAppUrl}/api/health`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (!response.ok) {
      return {
        name: "Main App",
        status: "down",
        latency,
        message: `HTTP ${response.status}`,
      };
    }

    return {
      name: "Main App",
      status: latency > 1000 ? "degraded" : "healthy",
      latency,
    };
  } catch (error) {
    return {
      name: "Main App",
      status: "down",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run all health checks and store results.
 */
export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const results = await Promise.all([
    checkSupabaseHealth(),
    checkClerkHealth(),
    checkStripeHealth(),
    checkMainAppHealth(),
  ]);

  // Store results in database
  for (const result of results) {
    await supabaseAdmin.from("system_health_checks").insert({
      service_name: result.name,
      status: result.status,
      latency_ms: result.latency,
      error_message: result.message || null,
    });
  }

  // Log if any service is down
  const downServices = results.filter((r) => r.status === "down");
  if (downServices.length > 0) {
    await logAdminAction({
      action: "system.health_alert",
      targetType: "system",
      metadata: {
        downServices: downServices.map((s) => s.name),
        message: downServices.map((s) => `${s.name}: ${s.message}`).join(", "),
      },
    });
  }

  return results;
}

/**
 * Get recent health check history.
 */
export async function getHealthCheckHistory(limit = 50): Promise<SystemHealthCheck[]> {
  const { data, error } = await supabaseAdmin
    .from("system_health_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch health checks: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    serviceName: row.service_name,
    status: row.status as ServiceStatus,
    latencyMs: row.latency_ms,
    errorMessage: row.error_message,
    checkedAt: row.checked_at,
  }));
}

/**
 * Get latest health status for all services.
 */
export async function getLatestHealthStatus(): Promise<SystemHealthCheck[]> {
  const { data, error } = await supabaseAdmin.rpc("get_latest_health_status");

  if (error) {
    // Fallback to manual query if RPC doesn't exist
    const { data: fallbackData } = await supabaseAdmin
      .from("system_health_checks")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(100);

    // Get latest for each service
    const latestByService = new Map<string, Record<string, unknown>>();
    for (const row of fallbackData || []) {
      if (!latestByService.has(row.service_name)) {
        latestByService.set(row.service_name, row);
      }
    }

    return Array.from(latestByService.values()).map((row) => ({
      id: row.id,
      serviceName: row.service_name,
      status: row.status as ServiceStatus,
      latencyMs: row.latency_ms,
      errorMessage: row.error_message,
      checkedAt: row.checked_at,
    }));
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    serviceName: row.service_name as string,
    status: row.status as ServiceStatus,
    latencyMs: row.latency_ms as number | null,
    errorMessage: row.error_message as string | null,
    checkedAt: row.checked_at as string,
  }));
}
