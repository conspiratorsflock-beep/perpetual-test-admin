"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { Build, BuildStatus, BuildSource } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

interface SearchBuildsParams {
  status?: BuildStatus;
  source?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

function calculateDurationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return null;
  return e - s;
}

/**
 * Search builds with filtering.
 */
export async function searchBuilds({
  status,
  source,
  projectId,
  limit = 50,
  offset = 0,
}: SearchBuildsParams = {}): Promise<{ builds: Build[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("builds")
    .select(
      `id, project_id, release_id, name, description, status, start_date, end_date, source, source_metadata, api_key_id, cicd_provider, cicd_external_id, cicd_run_url, cicd_artifacts, created_by, updated_by, deleted_at, jira_version_id, created_at, updated_at,
      projects:project_id (name),
      releases:release_id (name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source as "manual" | "bitbucket_webhook" | "api" | "cli");
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch builds: ${error.message}`);

  const builds: Build[] = (data || []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: (row.projects as unknown as { name?: string } | null)?.name || null,
    releaseId: row.release_id,
    releaseName: (row.releases as unknown as { name?: string } | null)?.name || null,
    name: row.name,
    description: row.description,
    status: row.status as BuildStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    source: (row.source ?? "manual") as BuildSource,
    sourceMetadata: row.source_metadata as Record<string, unknown> | null,
    apiKeyId: row.api_key_id,
    cicdProvider: row.cicd_provider,
    cicdExternalId: row.cicd_external_id,
    cicdRunUrl: row.cicd_run_url,
    cicdArtifacts: row.cicd_artifacts as Record<string, unknown> | null,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    jiraVersionId: row.jira_version_id,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  }));

  return { builds, total: count || 0 };
}

/**
 * Get a single build by ID.
 */
export async function getBuildById(id: string): Promise<Build | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("builds")
    .select(
      `id, project_id, release_id, name, description, status, start_date, end_date, source, source_metadata, api_key_id, cicd_provider, cicd_external_id, cicd_run_url, cicd_artifacts, created_by, updated_by, deleted_at, jira_version_id, created_at, updated_at,
      projects:project_id (name),
      releases:release_id (name)`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    projectName: (data.projects as unknown as { name?: string } | null)?.name || null,
    releaseId: data.release_id,
    releaseName: (data.releases as unknown as { name?: string } | null)?.name || null,
    name: data.name,
    description: data.description,
    status: data.status as BuildStatus,
    startDate: data.start_date,
    endDate: data.end_date,
    source: (data.source ?? "manual") as BuildSource,
    sourceMetadata: data.source_metadata as Record<string, unknown> | null,
    apiKeyId: data.api_key_id,
    cicdProvider: data.cicd_provider,
    cicdExternalId: data.cicd_external_id,
    cicdRunUrl: data.cicd_run_url,
    cicdArtifacts: data.cicd_artifacts as Record<string, unknown> | null,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    deletedAt: data.deleted_at,
    jiraVersionId: data.jira_version_id,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

/**
 * Update build status.
 */
export async function updateBuildStatus(buildId: string, status: BuildStatus): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("builds")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", buildId);

  if (error) throw new Error(`Failed to update build: ${error.message}`);

  await logAdminAction({
    action: "build.update_status",
    targetType: "build",
    targetId: buildId,
    metadata: { status },
  });
}

/**
 * Assign a build to a project.
 */
export async function assignBuildToProject(buildId: string, projectId: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("builds")
    .update({ project_id: projectId, updated_at: new Date().toISOString() })
    .eq("id", buildId);

  if (error) throw new Error(`Failed to assign build: ${error.message}`);

  await logAdminAction({
    action: "build.assign",
    targetType: "build",
    targetId: buildId,
    metadata: { projectId },
  });
}

/**
 * Get build metrics.
 */
export async function getBuildMetrics(): Promise<{
  total: number;
  planned: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMs: number;
  bySource: Record<string, number>;
  byProvider: Record<string, number>;
}> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("builds")
    .select("status, start_date, end_date, source, cicd_provider");

  if (error) throw new Error(`Failed to fetch build metrics: ${error.message}`);

  const rows = data || [];
  const total = rows.length;
  const planned = rows.filter((r) => r.status === "planned").length;
  const running = rows.filter((r) => r.status === "running").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;

  const durations = rows
    .map((r) => calculateDurationMs(r.start_date, r.end_date))
    .filter((d): d is number => d !== null && d > 0);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const bySource: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  for (const row of rows) {
    bySource[row.source || "unknown"] = (bySource[row.source || "unknown"] || 0) + 1;
    if (row.cicd_provider) {
      byProvider[row.cicd_provider] = (byProvider[row.cicd_provider] || 0) + 1;
    }
  }

  return {
    total,
    planned,
    running,
    completed,
    failed,
    cancelled,
    avgDurationMs,
    bySource,
    byProvider,
  };
}
