"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { IntegrationHealth } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

interface SearchIntegrationsParams {
  provider?: string;
  status?: string;
  orgId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search integrations across all provider tables.
 */
export async function searchIntegrations({
  provider,
  status,
  orgId,
  limit = 50,
  offset = 0,
}: SearchIntegrationsParams = {}): Promise<{ integrations: IntegrationHealth[]; total: number }> {
  await requireAdmin();

  // Query all integration tables in parallel
  const [
    cicdData,
    slackData,
    teamsData,
    jiraData,
    azureData,
  ] = await Promise.all([
    supabaseAdmin.from("cicd_connections").select("*, projects(name, org_id, organizations(name))"),
    supabaseAdmin.from("slack_connections").select("*, organizations(name)"),
    supabaseAdmin.from("teams_connections").select("*, organizations(name)"),
    supabaseAdmin.from("jira_connections").select("*"),
    supabaseAdmin.from("azure_devops_connections").select("*, organizations(name)"),
  ]);

  const integrations: IntegrationHealth[] = [];

  // Map CICD connections
  for (const row of cicdData.data || []) {
    const project = row.projects as unknown as { name?: string; org_id?: string; organizations?: { name?: string } } | null;
    integrations.push({
      id: row.id,
      orgId: project?.org_id || "",
      orgName: project?.organizations?.name || null,
      projectId: row.project_id,
      projectName: project?.name || null,
      provider: String(row.provider || "unknown"),
      type: "cicd",
      status: row.status || "unknown",
      externalId: row.external_id || null,
      lastSyncAt: row.last_used_at || row.last_event_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at,
    });
  }

  // Map Slack connections
  for (const row of slackData.data || []) {
    const org = row.organizations as unknown as { name?: string } | null;
    integrations.push({
      id: row.id,
      orgId: row.org_id,
      orgName: org?.name || null,
      projectId: null,
      projectName: null,
      provider: "slack",
      type: "slack",
      status: row.status || "unknown",
      externalId: row.channel_name || null,
      lastSyncAt: row.last_used_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at,
    });
  }

  // Map Teams connections
  for (const row of teamsData.data || []) {
    const org = row.organizations as unknown as { name?: string } | null;
    integrations.push({
      id: row.id,
      orgId: row.org_id,
      orgName: org?.name || null,
      projectId: null,
      projectName: null,
      provider: "teams",
      type: "teams",
      status: row.status || "unknown",
      externalId: row.channel_name || null,
      lastSyncAt: row.last_used_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at,
    });
  }

  // Map Jira connections
  for (const row of jiraData.data || []) {
    integrations.push({
      id: row.id,
      orgId: row.org_id,
      orgName: null,
      projectId: null,
      projectName: null,
      provider: "jira",
      type: "jira",
      status: row.status || "unknown",
      externalId: row.jira_site_name || null,
      lastSyncAt: row.last_synced_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at,
    });
  }

  // Map Azure DevOps connections
  for (const row of azureData.data || []) {
    const org = row.organizations as unknown as { name?: string } | null;
    integrations.push({
      id: row.id,
      orgId: row.org_id,
      orgName: org?.name || null,
      projectId: null,
      projectName: null,
      provider: "azure_devops",
      type: "azure_devops",
      status: row.status || "unknown",
      externalId: row.ado_org_name || null,
      lastSyncAt: row.last_synced_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at,
    });
  }

  // Apply filters
  let filtered = integrations;
  if (provider) filtered = filtered.filter((i) => i.provider === provider);
  if (status) filtered = filtered.filter((i) => i.status === status);
  if (orgId) filtered = filtered.filter((i) => i.orgId === orgId);

  // Sort by created_at desc
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return { integrations: paginated, total };
}

export async function disconnectIntegration(id: string, type: IntegrationHealth["type"]): Promise<void> {
  await requireAdmin();

  const tableMap: Record<string, string> = {
    cicd: "cicd_connections",
    slack: "slack_connections",
    teams: "teams_connections",
    jira: "jira_connections",
    azure_devops: "azure_devops_connections",
  };

  const table = tableMap[type];
  if (!table) throw new Error(`Unknown integration type: ${type}`);

  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(`Failed to disconnect: ${error.message}`);

  await logAdminAction({
    action: "integration.disconnect",
    targetType: "integration",
    targetId: id,
    metadata: { type },
  });
}

export async function getIntegrationMetrics(): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  errors: number;
}> {
  await requireAdmin();

  const { integrations } = await searchIntegrations({ limit: 10000 });

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let errors = 0;

  for (const i of integrations) {
    byType[i.type] = (byType[i.type] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    if (i.status === "error" || i.errorMessage) errors++;
  }

  return { total: integrations.length, byType, byStatus, errors };
}
