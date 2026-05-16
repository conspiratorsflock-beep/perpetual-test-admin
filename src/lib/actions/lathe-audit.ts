"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { LatheAuditLog } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function searchLatheAuditLogs({
  entityType,
  entityId,
  action,
  performedBy,
  limit = 50,
  offset = 0,
}: {
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: LatheAuditLog[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("lathe_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  if (action) query = query.eq("action", action);
  if (performedBy) query = query.eq("performed_by", performedBy);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  const logs = (data || []).map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldValue: row.old_value as Record<string, unknown> | null,
    newValue: row.new_value as Record<string, unknown> | null,
    performedBy: row.performed_by,
    performedByEmail: row.performed_by_email,
    createdAt: row.created_at,
  }));

  return { logs, total: count || 0 };
}

export async function getLatheAuditLogById(id: string): Promise<LatheAuditLog | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("lathe_audit_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    entityType: data.entity_type,
    entityId: data.entity_id,
    action: data.action,
    oldValue: data.old_value as Record<string, unknown> | null,
    newValue: data.new_value as Record<string, unknown> | null,
    performedBy: data.performed_by,
    performedByEmail: data.performed_by_email,
    createdAt: data.created_at,
  };
}

export async function getLatheAuditEntityTypes(): Promise<string[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("lathe_audit_logs")
    .select("entity_type");

  if (error) throw new Error(`Failed to fetch entity types: ${error.message}`);

  const types = new Set<string>();
  for (const row of data || []) {
    types.add(row.entity_type);
  }
  return Array.from(types).sort();
}
