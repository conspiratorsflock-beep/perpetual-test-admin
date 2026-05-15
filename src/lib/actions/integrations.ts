"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { IntegrationHealth, IntegrationStatus } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function searchIntegrations({
  provider,
  status,
  orgId,
  limit = 50,
  offset = 0,
}: {
  provider?: string;
  status?: IntegrationStatus;
  orgId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ integrations: IntegrationHealth[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("integration_connections")
    .select(
      `id, provider, org_id, project_id, status, connected_at, last_sync_at, error_message, config, created_at, updated_at,
      organizations:org_id (name),
      projects:project_id (name)`,
      { count: "exact" }
    );

  if (provider) query = query.eq("provider", provider);
  if (status) query = query.eq("status", status);
  if (orgId) query = query.eq("org_id", orgId);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);

  const integrations = (data || []).map((row) => ({
    id: row.id,
    provider: row.provider,
    orgId: row.org_id,
    orgName: (row.organizations as { name?: string } | null)?.name || "Unknown",
    projectId: row.project_id,
    projectName: (row.projects as { name?: string } | null)?.name || null,
    status: row.status as IntegrationStatus,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    errorMessage: row.error_message,
    config: (row.config as Record<string, unknown>) || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { integrations, total: count || 0 };
}

export async function getIntegrationById(id: string): Promise<IntegrationHealth | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("integration_connections")
    .select(
      `id, provider, org_id, project_id, status, connected_at, last_sync_at, error_message, config, created_at, updated_at,
      organizations:org_id (name),
      projects:project_id (name)`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    provider: data.provider,
    orgId: data.org_id,
    orgName: (data.organizations as { name?: string } | null)?.name || "Unknown",
    projectId: data.project_id,
    projectName: (data.projects as { name?: string } | null)?.name || null,
    status: data.status as IntegrationStatus,
    connectedAt: data.connected_at,
    lastSyncAt: data.last_sync_at,
    errorMessage: data.error_message,
    config: (data.config as Record<string, unknown>) || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getIntegrationProviders(): Promise<
  { provider: string; total: number; active: number; error: number }[]
> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("integration_connections")
    .select("provider, status");

  if (error) throw new Error(`Failed to fetch providers: ${error.message}`);

  const stats = new Map<string, { total: number; active: number; error: number }>();
  for (const row of data || []) {
    const s = stats.get(row.provider) || { total: 0, active: 0, error: 0 };
    s.total++;
    if (row.status === "active") s.active++;
    if (row.status === "error") s.error++;
    stats.set(row.provider, s);
  }

  return Array.from(stats.entries()).map(([provider, s]) => ({
    provider,
    ...s,
  }));
}

export async function disconnectIntegration(id: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("integration_connections")
    .update({ status: "not_configured", connected_at: null, last_sync_at: null })
    .eq("id", id);

  if (error) throw new Error(`Failed to disconnect integration: ${error.message}`);

  await logAdminAction({
    action: "integration.disconnect",
    targetType: "integration",
    targetId: id,
  });
}

export async function retryIntegrationSync(id: string): Promise<void> {
  await requireAdmin();

  // Admin-triggered retry: reset error state and update last_sync_at to now
  const { error } = await supabaseAdmin
    .from("integration_connections")
    .update({ status: "active", error_message: null, last_sync_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to retry integration: ${error.message}`);

  await logAdminAction({
    action: "integration.retry",
    targetType: "integration",
    targetId: id,
  });
}
