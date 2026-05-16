"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { AdminProject } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

interface SearchProjectsParams {
  query?: string;
  orgId?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search projects with filtering.
 */
export async function searchProjects({
  query,
  orgId,
  includeDeleted = false,
  limit = 50,
  offset = 0,
}: SearchProjectsParams = {}): Promise<{ projects: AdminProject[]; total: number }> {
  await requireAdmin();

  let dbQuery = supabaseAdmin
    .from("projects")
    .select("*, organizations(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeDeleted) {
    dbQuery = dbQuery.is("deleted_at", null);
  }

  if (orgId) {
    dbQuery = dbQuery.eq("org_id", orgId);
  }

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  const projects: AdminProject[] = await Promise.all(
    (data || []).map(async (row) => {
      const orgName = (row.organizations as unknown as { name: string } | null)?.name ?? "Unknown";

      const { count: memberCount } = await supabaseAdmin
        .from("project_members")
        .select("*", { count: "exact", head: true })
        .eq("project_id", row.id);

      const { count: testCaseCount } = await supabaseAdmin
        .from("test_cases")
        .select("*", { count: "exact", head: true })
        .eq("project_id", row.id)
        .is("deleted_at", null);

      const { count: testRunCount } = await supabaseAdmin
        .from("test_runs")
        .select("*", { count: "exact", head: true })
        .eq("project_id", row.id);

      const { count: releaseCount } = await supabaseAdmin
        .from("releases")
        .select("*", { count: "exact", head: true })
        .eq("project_id", row.id)
        .is("deleted_at", null);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        projectCode: row.project_code,
        jiraProjectKey: row.jira_project_key,
        jiraSiteUrl: row.jira_site_url,
        bitbucketRepoUrl: row.bitbucket_repo_url,
        requirementsEnabled: row.requirements_enabled ?? false,
        orgId: row.org_id,
        orgName,
        memberCount: memberCount ?? 0,
        testCaseCount: testCaseCount ?? 0,
        testRunCount: testRunCount ?? 0,
        releaseCount: releaseCount ?? 0,
        deletedAt: row.deleted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    })
  );

  return { projects, total: count ?? 0 };
}

/**
 * Get a single project by ID.
 */
export async function getProjectById(projectId: string): Promise<AdminProject | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*, organizations(name)")
    .eq("id", projectId)
    .single();

  if (error || !data) {
    console.error("Failed to get project:", error);
    return null;
  }

  const orgName = (data.organizations as unknown as { name: string } | null)?.name ?? "Unknown";

  const [{ count: memberCount }, { count: testCaseCount }, { count: testRunCount }, { count: releaseCount }] = await Promise.all([
    supabaseAdmin.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", data.id),
    supabaseAdmin.from("test_cases").select("*", { count: "exact", head: true }).eq("project_id", data.id).is("deleted_at", null),
    supabaseAdmin.from("test_runs").select("*", { count: "exact", head: true }).eq("project_id", data.id),
    supabaseAdmin.from("releases").select("*", { count: "exact", head: true }).eq("project_id", data.id).is("deleted_at", null),
  ]);

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    projectCode: data.project_code,
    jiraProjectKey: data.jira_project_key,
    jiraSiteUrl: data.jira_site_url,
    bitbucketRepoUrl: data.bitbucket_repo_url,
    requirementsEnabled: data.requirements_enabled ?? false,
    orgId: data.org_id,
    orgName,
    memberCount: memberCount ?? 0,
    testCaseCount: testCaseCount ?? 0,
    testRunCount: testRunCount ?? 0,
    releaseCount: releaseCount ?? 0,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Toggle requirements_enabled for a project.
 */
export async function toggleRequirementsEnabled(projectId: string, enabled: boolean): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ requirements_enabled: enabled })
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  await logAdminAction({
    action: "project.toggle_requirements",
    targetType: "project",
    targetId: projectId,
    metadata: { enabled },
  });
}

/**
 * Soft-delete a project.
 */
export async function softDeleteProject(projectId: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }

  await logAdminAction({
    action: "project.soft_delete",
    targetType: "project",
    targetId: projectId,
  });
}

/**
 * Restore a soft-deleted project.
 */
export async function restoreProject(projectId: string): Promise<void> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to restore project: ${error.message}`);
  }

  await logAdminAction({
    action: "project.restore",
    targetType: "project",
    targetId: projectId,
  });
}

/**
 * Get project members.
 */
export async function getProjectMembers(projectId: string): Promise<
  { id: string; email: string; name: string | null; role: string; joinedAt: string }[]
> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select("clerk_user_id, email, display_name, role, joined_at")
    .eq("project_id", projectId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project members: ${error.message}`);
  }

  return (data || []).map((m) => ({
    id: m.clerk_user_id,
    email: m.email,
    name: m.display_name,
    role: m.role,
    joinedAt: m.joined_at,
  }));
}
