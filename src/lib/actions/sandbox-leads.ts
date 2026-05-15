"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { SandboxLead } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function searchLeads({
  source,
  query,
  converted,
  limit = 50,
  offset = 0,
}: {
  source?: string;
  query?: string;
  converted?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ leads: SandboxLead[]; total: number }> {
  await requireAdmin();

  let dbQuery = supabaseAdmin
    .from("sandbox_leads")
    .select(
      `id, email, org_id, source, notes, converted_at, created_at,
      organizations:org_id (name)`,
      { count: "exact" }
    );

  if (source) dbQuery = dbQuery.eq("source", source);
  if (query) dbQuery = dbQuery.ilike("email", `%${query}%`);
  if (converted === true) dbQuery = dbQuery.not("converted_at", "is", null);
  if (converted === false) dbQuery = dbQuery.is("converted_at", null);

  const { data, error, count } = await dbQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);

  const leads = (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    orgId: row.org_id,
    orgName: (row.organizations as { name?: string } | null)?.name || null,
    source: row.source,
    notes: row.notes,
    convertedAt: row.converted_at,
    createdAt: row.created_at,
  }));

  return { leads, total: count || 0 };
}

export async function getLeadById(id: string): Promise<SandboxLead | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("sandbox_leads")
    .select(
      `id, email, org_id, source, notes, converted_at, created_at,
      organizations:org_id (name)`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    orgId: data.org_id,
    orgName: (data.organizations as { name?: string } | null)?.name || null,
    source: data.source,
    notes: data.notes,
    convertedAt: data.converted_at,
    createdAt: data.created_at,
  };
}

export async function markLeadConverted(id: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("sandbox_leads")
    .update({ converted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to convert lead: ${error.message}`);

  await logAdminAction({
    action: "lead.convert",
    targetType: "lead",
    targetId: id,
  });
}

export async function deleteLead(id: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("sandbox_leads").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete lead: ${error.message}`);

  await logAdminAction({
    action: "lead.delete",
    targetType: "lead",
    targetId: id,
  });
}

export async function getLeadMetrics(): Promise<{
  total: number;
  converted: number;
  conversionRate: number;
  bySource: Record<string, number>;
}> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("sandbox_leads")
    .select("source, converted_at");

  if (error) throw new Error(`Failed to fetch lead metrics: ${error.message}`);

  const rows = data || [];
  const total = rows.length;
  const converted = rows.filter((r) => r.converted_at !== null).length;
  const bySource: Record<string, number> = {};
  for (const row of rows) {
    bySource[row.source] = (bySource[row.source] || 0) + 1;
  }

  return {
    total,
    converted,
    conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    bySource,
  };
}
