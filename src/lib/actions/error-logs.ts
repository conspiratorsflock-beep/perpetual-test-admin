"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { z } from "zod";
import { EXPORT_ROW_LIMIT, STATS_QUERY_LIMIT } from "@/lib/constants/query-limits";
import type { AdminErrorLog } from "@/types/admin";
import type { Json } from "@/types/database.types";


const logErrorSchema = z.object({
  errorType: z.string().trim().min(1).max(100),
  message: z.string().min(1).max(10_000),
  stackTrace: z.string().max(50_000).optional(),
  userId: z.string().min(1).max(128).optional(),
  orgId: z.string().min(1).max(128).optional(),
  path: z.string().max(2_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Log an error (to be called from the main app or API routes).
 * NOTE: If this needs to be called cross-app without an admin session, convert
 * this to an API route that authenticates via a shared ADMIN_API_SECRET env var.
 */
export async function logError({
  errorType,
  message,
  stackTrace,
  userId,
  orgId,
  path,
  metadata,
}: {
  errorType: string;
  message: string;
  stackTrace?: string;
  userId?: string;
  orgId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await requireAdmin();
  // Validate-and-drop: this recorder must never throw into the caller's
  // flow, so invalid input is logged and discarded rather than rejected.
  const parsed = logErrorSchema.safeParse({
    errorType,
    message,
    stackTrace,
    userId,
    orgId,
    path,
    metadata,
  });
  if (!parsed.success) {
    console.error("logError: invalid input dropped:", parsed.error.issues[0].message);
    return;
  }
  try {
    await supabaseAdmin.from("admin_error_logs").insert({
      error_type: errorType,
      message,
      stack_trace: stackTrace || null,
      user_id: userId || null,
      org_id: orgId || null,
      path: path || null,
      metadata: (metadata || {}) as Json,
    });
  } catch (error) {
    // Don't throw - error logging should never break the main flow
    console.error("Failed to log error:", error);
  }
}

/**
 * Get error logs with filtering.
 */
export async function getErrorLogs({
  limit = 50,
  offset = 0,
  errorType,
  userId,
  orgId,
  path,
  startDate,
  endDate,
  search,
}: {
  limit?: number;
  offset?: number;
  errorType?: string;
  userId?: string;
  orgId?: string;
  path?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
} = {}): Promise<{ logs: AdminErrorLog[]; count: number }> {
  await requireAdmin();
  let query = supabaseAdmin
    .from("admin_error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (errorType) {
    query = query.eq("error_type", errorType);
  }
  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (orgId) {
    query = query.eq("org_id", orgId);
  }
  if (path) {
    query = query.ilike("path", `%${path}%`);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }
  if (search) {
    query = query.or(`message.ilike.%${search}%,error_type.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch error logs: ${error.message}`);
  }

  const logs: AdminErrorLog[] = (data || []).map((row) => ({
    id: row.id,
    errorType: row.error_type,
    message: row.message,
    stackTrace: row.stack_trace,
    userId: row.user_id,
    orgId: row.org_id,
    path: row.path,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at ?? "",
  }));

  return { logs, count: count || 0 };
}

/**
 * Get error statistics.
 */
export async function getErrorStats(hours = 24): Promise<{
  total: number;
  byType: Record<string, number>;
  byPath: Record<string, number>;
}> {
  await requireAdmin();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("admin_error_logs")
    .select("error_type,path")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(STATS_QUERY_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch error stats: ${error.message}`);
  }

  const byType: Record<string, number> = {};
  const byPath: Record<string, number> = {};

  for (const row of data || []) {
    byType[row.error_type] = (byType[row.error_type] || 0) + 1;
    if (row.path) {
      byPath[row.path] = (byPath[row.path] || 0) + 1;
    }
  }

  return {
    total: data?.length || 0,
    byType,
    byPath,
  };
}

const purgeOldErrorsSchema = z.object({
  daysToKeep: z.number().int().min(1).max(3650),
});

/**
 * Delete old error logs.
 */
export async function purgeOldErrors(daysToKeep = 30): Promise<{ deleted: number }> {
  await requireAdmin();
  const parsed = purgeOldErrorsSchema.safeParse({ daysToKeep });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabaseAdmin
    .from("admin_error_logs")
    .delete()
    .lt("created_at", cutoff);

  if (error) {
    throw new Error(`Failed to purge old errors: ${error.message}`);
  }

  await logAdminAction({
    action: "system.purge_errors",
    targetType: "system",
    metadata: { daysToKeep, deleted: count || 0 },
  });

  return { deleted: count || 0 };
}

/**
 * Export error logs as CSV.
 */
export async function exportErrorLogsToCSV({
  startDate,
  endDate,
  errorType,
}: {
  startDate?: string;
  endDate?: string;
  errorType?: string;
} = {}): Promise<string> {
  await requireAdmin();
  let query = supabaseAdmin
    .from("admin_error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }
  if (errorType) {
    query = query.eq("error_type", errorType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to export error logs: ${error.message}`);
  }

  // CSV header
  const headers = ["ID", "Error Type", "Message", "Path", "User ID", "Org ID", "Created At"];

  // CSV rows
  const rows = (data || []).map((row) => [
    row.id,
    row.error_type,
    `"${row.message.replace(/"/g, '""')}"`,
    row.path || "",
    row.user_id || "",
    row.org_id || "",
    row.created_at,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
