"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin, requireAdmin } from "@/lib/clerk/admin-check";
import type { LatheAuditLog } from "@/types/admin";


interface SearchLatheAuditLogsParams {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  userId?: string;
  orgId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search audit logs with filtering.
 */
export async function searchLatheAuditLogs({
  resourceType,
  resourceId,
  action,
  userId,
  orgId,
  limit = 50,
  offset = 0,
}: SearchLatheAuditLogsParams = {}): Promise<{ logs: LatheAuditLog[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (resourceType) query = query.eq("resource_type", resourceType);
  if (resourceId) query = query.eq("resource_id", resourceId);
  if (action) query = query.ilike("action", `%${action}%`);
  if (userId) query = query.eq("user_id", userId);
  if (orgId) query = query.eq("org_id", orgId);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  const logs: LatheAuditLog[] = (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    orgId: row.org_id,
    projectId: row.project_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    oldValue: row.old_value as Record<string, unknown> | null,
    newValue: row.new_value as Record<string, unknown> | null,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.created_at,
  }));

  return { logs, total: count || 0 };
}

/**
 * Get a single audit log by ID.
 */
export async function getLatheAuditLogById(id: string): Promise<LatheAuditLog | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    orgId: data.org_id,
    projectId: data.project_id,
    action: data.action,
    resourceType: data.resource_type,
    resourceId: data.resource_id,
    oldValue: data.old_value as Record<string, unknown> | null,
    newValue: data.new_value as Record<string, unknown> | null,
    metadata: data.metadata as Record<string, unknown> | null,
    createdAt: data.created_at,
  };
}

/**
 * Get distinct resource types.
 */
export async function getLatheAuditResourceTypes(): Promise<string[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("resource_type");

  if (error) {
    console.error("Failed to fetch resource types:", error);
    return [];
  }

  const types = new Set<string>();
  for (const row of data || []) {
    if (row.resource_type) types.add(row.resource_type);
  }
  return Array.from(types).sort();
}
