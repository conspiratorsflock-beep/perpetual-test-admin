"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

interface ApiUsageRecord {
  date: string;
  total_calls: number;
  unique_users: number;
  unique_orgs: number;
  endpoint_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

/**
 * Get API calls for today
 */
export async function getApiCallsToday(): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("api_usage_daily")
      .select("total_calls")
      .eq("date", today)
      .single();

    if (error) {
      // If no record exists for today, return 0
      if (error.code === "PGRST116") {
        return 0;
      }
      throw error;
    }

    return data?.total_calls || 0;
  } catch (error) {
    console.error("Failed to get API calls today:", error);
    return 0;
  }
}

/**
 * Get API usage for the last N days
 */
export async function getApiUsageHistory(days = 7): Promise<ApiUsageRecord[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const { data, error } = await supabaseAdmin
      .from("api_usage_daily")
      .select("date, total_calls, unique_users, unique_orgs, endpoint_breakdown, status_breakdown")
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) throw error;

    return (data || []) as ApiUsageRecord[];
  } catch (error) {
    console.error("Failed to get API usage history:", error);
    return [];
  }
}

/**
 * Get total API calls for current month
 */
export async function getApiCallsThisMonth(): Promise<number> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data, error } = await supabaseAdmin
      .from("api_usage_daily")
      .select("total_calls")
      .gte("date", startOfMonth.toISOString().split("T")[0])
      .lte("date", endOfMonth.toISOString().split("T")[0]);

    if (error) throw error;

    return (data || []).reduce((sum, record) => sum + (record.total_calls || 0), 0);
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
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("api_usage_daily")
      .select("date, total_calls")
      .in("date", [today, yesterday]);

    if (error) throw error;

    const todayCalls = data?.find((d) => d.date === today)?.total_calls || 0;
    const yesterdayCalls = data?.find((d) => d.date === yesterday)?.total_calls || 0;

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
 * This is a utility for the main Perpetual Test application to call
 */
export async function recordApiCall({
  endpoint,
  statusCode,
  userId,
  orgId,
}: {
  endpoint: string;
  statusCode: number;
  userId?: string;
  orgId?: string;
}): Promise<void> {
  try {
    // Use the database function to increment
    await supabaseAdmin.rpc("increment_api_calls", {
      p_endpoint: endpoint,
      p_status_code: statusCode,
      p_user_id: userId,
      p_org_id: orgId,
    });
  } catch (error) {
    console.error("Failed to record API call:", error);
    // Don't throw - this is non-critical telemetry
  }
}
