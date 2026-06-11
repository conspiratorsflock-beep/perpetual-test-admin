"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";


function startOfDayUTC(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return d.toISOString();
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function fillDates(start: Date, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    result.push(formatDateKey(d));
  }
  return result;
}

function bucketByDay(rows: Array<{ created_at: string | null }>, dateKeys: string[]): number[] {
  const counts = new Map<string, number>();
  for (const key of dateKeys) counts.set(key, 0);

  for (const row of rows) {
    if (!row.created_at) continue;
    const key = row.created_at.split("T")[0];
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return dateKeys.map((key) => counts.get(key) ?? 0);
}

export interface DashboardTrends {
  labels: string[];
  newUsers: number[];
  newOrgs: number[];
  apiCalls: number[];
  userChange: { value: number; trend: "up" | "down" | "neutral" };
  orgChange: { value: number; trend: "up" | "down" | "neutral" };
}

/**
 * Get daily trend buckets for the last N days.
 */
export async function getDashboardTrends(days = 14): Promise<DashboardTrends> {
  await requireAdmin();

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - days + 1);
  const windowStartISO = startOfDayUTC(windowStart);

  const dateKeys = fillDates(windowStart, days);

  const [usersRes, orgsRes, apiRes] = await Promise.all([
    supabaseAdmin.from("users").select("created_at").gte("created_at", windowStartISO),
    supabaseAdmin.from("organizations").select("created_at").gte("created_at", windowStartISO),
    supabaseAdmin.from("api_usage_logs").select("created_at").gte("created_at", windowStartISO),
  ]);

  // A swallowed error here would render flat-zero sparklines indistinguishable
  // from "no activity" — fail loudly instead
  const failed = [usersRes.error, orgsRes.error, apiRes.error].find(Boolean);
  if (failed) {
    throw new Error(`Failed to fetch dashboard trends: ${failed.message}`);
  }
  const { data: usersData } = usersRes;
  const { data: orgsData } = orgsRes;
  const { data: apiData } = apiRes;

  const newUsers = bucketByDay(usersData ?? [], dateKeys);
  const newOrgs = bucketByDay(orgsData ?? [], dateKeys);
  const apiCalls = bucketByDay(apiData ?? [], dateKeys);

  // Compute week-over-week change (last 7 days vs prior 7 days)
  const half = Math.floor(days / 2);
  const recentUsers = newUsers.slice(-half).reduce((a, b) => a + b, 0);
  const priorUsers = newUsers.slice(0, half).reduce((a, b) => a + b, 0);
  const userPct = priorUsers > 0 ? ((recentUsers - priorUsers) / priorUsers) * 100 : 0;

  const recentOrgs = newOrgs.slice(-half).reduce((a, b) => a + b, 0);
  const priorOrgs = newOrgs.slice(0, half).reduce((a, b) => a + b, 0);
  const orgPct = priorOrgs > 0 ? ((recentOrgs - priorOrgs) / priorOrgs) * 100 : 0;

  return {
    labels: dateKeys,
    newUsers,
    newOrgs,
    apiCalls,
    userChange: {
      value: Math.round(userPct * 10) / 10,
      trend: userPct > 5 ? "up" : userPct < -5 ? "down" : "neutral",
    },
    orgChange: {
      value: Math.round(orgPct * 10) / 10,
      trend: orgPct > 5 ? "up" : orgPct < -5 ? "down" : "neutral",
    },
  };
}
