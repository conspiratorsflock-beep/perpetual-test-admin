"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { IntegrationHealth, IntegrationStatus } from "@/types/admin";

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

  // Query all integration tables in parallel with explicit columns
  const [
    cicdData,
    slackData,
    teamsData,
    jiraData,
    azureData,
  ] = await Promise.all([
    supabaseAdmin.from("cicd_connections").select("id, project_id, provider, external_id, error_count, last_used_at, last_event_at, error_message, created_at, projects(name, org_id, organizations(name))"),
    supabaseAdmin.from("slack_connections").select("id, org_id, status, channel_name, last_used_at, error_message, created_at, organizations(name)"),
    supabaseAdmin.from("teams_connections").select("id, org_id, status, channel_name, last_used_at, error_message, created_at, organizations(name)"),
    supabaseAdmin.from("jira_connections").select("id, org_id, status, jira_site_name, last_synced_at, error_message, created_at"),
    supabaseAdmin.from("azure_devops_connections").select("id, org_id, status, ado_org_name, last_synced_at, error_message, created_at, organizations(name)"),
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
      // NOTE: cicd_connections has no `status` column; derive from error counters.
      status: ((row.error_count ?? 0) > 0 ? "error" : "connected") as IntegrationStatus,
      externalId: row.external_id || null,
      lastSyncAt: row.last_used_at || row.last_event_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at ?? "",
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
      status: (row.status || "unknown") as IntegrationStatus,
      externalId: row.channel_name || null,
      lastSyncAt: row.last_used_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at ?? "",
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
      status: (row.status || "unknown") as IntegrationStatus,
      externalId: row.channel_name || null,
      lastSyncAt: row.last_used_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at ?? "",
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
      status: (row.status || "unknown") as IntegrationStatus,
      externalId: row.jira_site_name || null,
      lastSyncAt: row.last_synced_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at ?? "",
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
      status: (row.status || "unknown") as IntegrationStatus,
      externalId: row.ado_org_name || null,
      lastSyncAt: row.last_synced_at || null,
      errorMessage: row.error_message || null,
      createdAt: row.created_at ?? "",
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

  const table = tableMap[type] as
    | "cicd_connections"
    | "slack_connections"
    | "teams_connections"
    | "jira_connections"
    | "azure_devops_connections";
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

  // Lightweight count queries per table
  const [
    cicdCount,
    slackCount,
    teamsCount,
    jiraCount,
    azureCount,
  ] = await Promise.all([
    supabaseAdmin.from("cicd_connections").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("slack_connections").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("teams_connections").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("jira_connections").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("azure_devops_connections").select("*", { count: "exact", head: true }),
  ]);

  const byType: Record<string, number> = {
    cicd: cicdCount.count ?? 0,
    slack: slackCount.count ?? 0,
    teams: teamsCount.count ?? 0,
    jira: jiraCount.count ?? 0,
    azure_devops: azureCount.count ?? 0,
  };

  const total = Object.values(byType).reduce((a, b) => a + b, 0);

  // Narrow selects for status/error breakdowns
  const [
    cicdStatus,
    slackStatus,
    teamsStatus,
    jiraStatus,
    azureStatus,
  ] = await Promise.all([
    supabaseAdmin.from("cicd_connections").select("error_count"),
    supabaseAdmin.from("slack_connections").select("status, error_message"),
    supabaseAdmin.from("teams_connections").select("status, error_message"),
    supabaseAdmin.from("jira_connections").select("status, error_message"),
    supabaseAdmin.from("azure_devops_connections").select("status, error_message"),
  ]);

  const byStatus: Record<string, number> = {};
  let errors = 0;

  for (const row of cicdStatus.data || []) {
    const status = (row.error_count ?? 0) > 0 ? "error" : "connected";
    byStatus[status] = (byStatus[status] || 0) + 1;
    if ((row.error_count ?? 0) > 0) errors++;
  }

  for (const row of [
    ...(slackStatus.data || []),
    ...(teamsStatus.data || []),
    ...(jiraStatus.data || []),
    ...(azureStatus.data || []),
  ]) {
    const status = (row.status as string) || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === "error" || row.error_message) errors++;
  }

  return { total, byType, byStatus, errors };
}
