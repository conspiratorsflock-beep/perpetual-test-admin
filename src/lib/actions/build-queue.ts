"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { BuildQueueItem, BuildQueueItemStatus } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function searchBuilds({
  provider,
  status,
  projectId,
  limit = 50,
  offset = 0,
}: {
  provider?: string;
  status?: BuildQueueItemStatus;
  projectId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ builds: BuildQueueItem[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("build_queue_items")
    .select(
      `id, name, cicd_provider, cicd_external_id, assigned_project_id, status, received_at, started_at, completed_at, duration_ms, branch, commit_sha, author_email, created_at, updated_at,
      projects:assigned_project_id (name)`,
      { count: "exact" }
    );

  if (provider) query = query.eq("cicd_provider", provider);
  if (status) query = query.eq("status", status);
  if (projectId) query = query.eq("assigned_project_id", projectId);

  const { data, error, count } = await query
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch builds: ${error.message}`);

  const builds = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    cicdProvider: row.cicd_provider,
    cicdExternalId: row.cicd_external_id,
    assignedProjectId: row.assigned_project_id,
    projectName: (row.projects as { name?: string } | null)?.name || null,
    status: row.status as BuildQueueItemStatus,
    receivedAt: row.received_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    branch: row.branch,
    commitSha: row.commit_sha,
    authorEmail: row.author_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { builds, total: count || 0 };
}

export async function getBuildById(id: string): Promise<BuildQueueItem | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("build_queue_items")
    .select(
      `id, name, cicd_provider, cicd_external_id, assigned_project_id, status, received_at, started_at, completed_at, duration_ms, branch, commit_sha, author_email, created_at, updated_at,
      projects:assigned_project_id (name)`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    cicdProvider: data.cicd_provider,
    cicdExternalId: data.cicd_external_id,
    assignedProjectId: data.assigned_project_id,
    projectName: (data.projects as { name?: string } | null)?.name || null,
    status: data.status as BuildQueueItemStatus,
    receivedAt: data.received_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    durationMs: data.duration_ms,
    branch: data.branch,
    commitSha: data.commit_sha,
    authorEmail: data.author_email,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function assignBuildToProject(buildId: string, projectId: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("build_queue_items")
    .update({ assigned_project_id: projectId })
    .eq("id", buildId);

  if (error) throw new Error(`Failed to assign build: ${error.message}`);

  await logAdminAction({
    action: "build_queue.assign",
    targetType: "build_queue",
    targetId: buildId,
    metadata: { projectId },
  });
}

export async function getBuildMetrics(): Promise<{
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  cancelled: number;
  avgDurationMs: number;
  byProvider: Record<string, number>;
}> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("build_queue_items")
    .select("status, duration_ms, cicd_provider");

  if (error) throw new Error(`Failed to fetch build metrics: ${error.message}`);

  const rows = data || [];
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const running = rows.filter((r) => r.status === "running").length;
  const success = rows.filter((r) => r.status === "success").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;

  const durations = rows
    .map((r) => r.duration_ms)
    .filter((d): d is number => d !== null && d > 0);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const byProvider: Record<string, number> = {};
  for (const row of rows) {
    byProvider[row.cicd_provider] = (byProvider[row.cicd_provider] || 0) + 1;
  }

  return {
    total,
    pending,
    running,
    success,
    failed,
    cancelled,
    avgDurationMs,
    byProvider,
  };
}
