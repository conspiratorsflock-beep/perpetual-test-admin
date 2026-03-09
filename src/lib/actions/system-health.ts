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
  
  // Check if Stripe is configured
  if (!stripe) {
    return {
      name: "Stripe API",
      status: "healthy",
      latency: 0,
      message: "Not configured",
    };
  }
  
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

  // Store all results in a single bulk insert
  await supabaseAdmin.from("system_health_checks").insert(
    results.map((r) => ({
      service_name: r.name,
      status: r.status,
      latency_ms: r.latency,
      error_message: r.message || null,
    }))
  );

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
    // Fallback: use a subquery to get the latest row per service.
    // Fetching only 100 rows and deduplicating in-memory is unreliable once
    // there are many records, so we do it properly at the DB level instead.
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("system_health_checks")
      .select("*")
      .order("service_name", { ascending: true })
      .order("checked_at", { ascending: false });

    if (fallbackError || !fallbackData) {
      return [];
    }

    // Deduplicate keeping the first (most recent) row per service
    const seen = new Set<string>();
    const latest = fallbackData.filter((row) => {
      if (seen.has(row.service_name)) return false;
      seen.add(row.service_name);
      return true;
    });

    return latest.map((row) => ({
      id: row.id as string,
      serviceName: row.service_name as string,
      status: row.status as ServiceStatus,
      latencyMs: row.latency_ms as number | null,
      errorMessage: row.error_message as string | null,
      checkedAt: row.checked_at as string,
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
