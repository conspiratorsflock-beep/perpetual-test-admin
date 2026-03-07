"use server";

import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AuditLog, AuditTargetType } from "@/types/admin";

interface LogAdminActionParams {
  action: string;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an admin action to the audit log.
 * Call this in every server action that modifies data.
 */
export async function logAdminAction({
  action,
  targetType,
  targetId = null,
  targetName = null,
  metadata = {},
}: LogAdminActionParams): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error("Cannot log admin action: no authenticated user");
      return;
    }

    // Get admin email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const adminEmail = user.emailAddresses[0]?.emailAddress || "unknown";

    // Get request headers for IP and user agent
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: userId,
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main action
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Fetches audit logs with optional filtering.
 */
export async function getAuditLogs({
  limit = 50,
  offset = 0,
  targetType,
  targetId,
  adminId,
  action,
  startDate,
  endDate,
}: {
  limit?: number;
  offset?: number;
  targetType?: AuditTargetType;
  targetId?: string;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{ logs: AuditLog[]; count: number }> {
  let query = supabaseAdmin
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (targetType) {
    query = query.eq("target_type", targetType);
  }
  if (targetId) {
    query = query.eq("target_id", targetId);
  }
  if (adminId) {
    query = query.eq("admin_id", adminId);
  }
  if (action) {
    query = query.eq("action", action);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  const logs: AuditLog[] = (data || []).map((row) => ({
    id: row.id,
    adminUserId: row.admin_id,
    adminEmail: row.admin_email,
    action: row.action,
    targetType: row.target_type as AuditTargetType,
    targetId: row.target_id,
    targetName: row.target_name,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));

  return { logs, count: count || 0 };
}

/**
 * Gets recent audit log entries for a specific target.
 */
export async function getAuditLogsForTarget(
  targetType: AuditTargetType,
  targetId: string,
  limit = 20
): Promise<AuditLog[]> {
  const { logs } = await getAuditLogs({
    targetType,
    targetId,
    limit,
  });
  return logs;
}
