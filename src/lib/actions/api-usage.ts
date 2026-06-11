"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin, requireAdmin } from "@/lib/clerk/admin-check";


function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get API calls for today
 */
export async function getApiCallsToday(): Promise<number> {
  await requireAdmin();
  try {
    const { count, error } = await supabaseAdmin
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay(new Date()));

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Failed to get API calls today:", error);
    return 0;
  }
}

/**
 * Get total API calls for current month
 */
export async function getApiCallsThisMonth(): Promise<number> {
  await requireAdmin();
  try {
    const { count, error } = await supabaseAdmin
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth(new Date()));

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Failed to get API calls this month:", error);
    return 0;
  }
}

/**
 * Get API calls comparison (today vs yesterday)
 */
export async function getApiCallsComparison(): Promise<{
  today: number;
  yesterday: number;
  change: number;
  trend: "up" | "down" | "neutral";
}> {
  await requireAdmin();
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [{ count: todayCount }, { count: yesterdayCount }] = await Promise.all([
      supabaseAdmin
        .from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay(today)),
      supabaseAdmin
        .from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay(yesterday))
        .lt("created_at", startOfDay(today)),
    ]);

    const todayCalls = todayCount ?? 0;
    const yesterdayCalls = yesterdayCount ?? 0;
    const change = yesterdayCalls > 0 ? ((todayCalls - yesterdayCalls) / yesterdayCalls) * 100 : 0;

    return {
      today: todayCalls,
      yesterday: yesterdayCalls,
      change: Math.round(change * 10) / 10,
      trend: change > 5 ? "up" : change < -5 ? "down" : "neutral",
    };
  } catch (error) {
    console.error("Failed to get API calls comparison:", error);
    return { today: 0, yesterday: 0, change: 0, trend: "neutral" };
  }
}

/**
 * Record an API call (to be called from the main app's API routes)
 * NOTE: If this needs to be called cross-app without an admin session, convert
 * this to an API route that authenticates via a shared ADMIN_API_SECRET env var.
 */
export async function recordApiCall({
  endpoint,
  method = "GET",
  statusCode,
  orgId,
}: {
  endpoint: string;
  method?: string;
  statusCode: number;
  orgId?: string;
}): Promise<void> {
  await requireAdmin();
  try {
    await supabaseAdmin.from("api_usage_logs").insert({
      endpoint,
      method,
      status_code: statusCode,
      org_id: orgId ?? null,
    });
  } catch (error) {
    console.error("Failed to record API call:", error);
    // Don't throw - this is non-critical telemetry
  }
}
