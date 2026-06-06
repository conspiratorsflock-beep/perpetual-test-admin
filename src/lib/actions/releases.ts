"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { Release, ReleaseStatus } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

interface SearchReleasesParams {
  projectId?: string;
  status?: ReleaseStatus;
  limit?: number;
  offset?: number;
}

/**
 * Search releases with filtering.
 */
export async function searchReleases({
  projectId,
  status,
  limit = 50,
  offset = 0,
}: SearchReleasesParams = {}): Promise<{ releases: Release[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("releases")
    .select(
      `id, project_id, name, description, status, target_date, created_by, updated_by, deleted_at, created_at, updated_at,
      projects:project_id (name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId) query = query.eq("project_id", projectId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch releases: ${error.message}`);

  const releases: Release[] = (data || []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: (row.projects as unknown as { name?: string } | null)?.name || null,
    name: row.name,
    description: row.description,
    status: row.status as ReleaseStatus,
    targetDate: row.target_date,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  }));

  return { releases, total: count || 0 };
}

/**
 * Get a single release by ID.
 */
export async function getReleaseById(id: string): Promise<Release | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("releases")
    .select(
      `id, project_id, name, description, status, target_date, created_by, updated_by, deleted_at, created_at, updated_at,
      projects:project_id (name)`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    projectName: (data.projects as unknown as { name?: string } | null)?.name || null,
    name: data.name,
    description: data.description,
    status: data.status as ReleaseStatus,
    targetDate: data.target_date,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    deletedAt: data.deleted_at,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

/**
 * Update release status.
 */
export async function updateReleaseStatus(releaseId: string, status: ReleaseStatus): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("releases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", releaseId);

  if (error) throw new Error(`Failed to update release: ${error.message}`);

  await logAdminAction({
    action: "release.update_status",
    targetType: "release",
    targetId: releaseId,
    metadata: { status },
  });
}

/**
 * Get release metrics.
 */
export async function getReleaseMetrics(): Promise<{
  total: number;
  planned: number;
  inProgress: number;
  released: number;
  archived: number;
}> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("releases")
    .select("status");

  if (error) throw new Error(`Failed to fetch release metrics: ${error.message}`);

  const rows = data || [];
  return {
    total: rows.length,
    planned: rows.filter((r) => r.status === "planned").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    released: rows.filter((r) => r.status === "released").length,
    archived: rows.filter((r) => r.status === "archived").length,
  };
}
