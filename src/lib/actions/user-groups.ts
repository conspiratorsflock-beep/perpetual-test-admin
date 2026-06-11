"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin, requireAdmin } from "@/lib/clerk/admin-check";
import type { UserGroup, GroupMembership, ProjectGroupAccess } from "@/types/admin";


async function resolveOrgId(orgId: string): Promise<string> {
  if (!orgId.startsWith("org_")) return orgId;
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("clerk_org_id", orgId)
    .single();
  if (!data) throw new Error("Organization not found");
  return data.id;
}

/**
 * Get all user groups for an organization, with member and project counts.
 */
export async function getUserGroups(orgId: string): Promise<UserGroup[]> {
  await requireAdmin();
  const resolvedOrgId = await resolveOrgId(orgId);

  const { data, error } = await supabaseAdmin
    .from("user_groups")
    .select("id, org_id, name, description, created_by, created_at, updated_at, group_memberships(count), project_group_access(count)")
    .eq("org_id", resolvedOrgId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch user groups: ${error.message}`);
  }

  return (data || []).map((g) => ({
    id: g.id,
    orgId: g.org_id,
    name: g.name,
    description: g.description,
    createdBy: g.created_by,
    createdAt: g.created_at ?? "",
    updatedAt: g.updated_at ?? "",
    memberCount: (g.group_memberships as unknown as [{ count: number }] | null)?.[0]?.count ?? 0,
    projectCount: (g.project_group_access as unknown as [{ count: number }] | null)?.[0]?.count ?? 0,
  }));
}

/**
 * Get a single user group.
 */
export async function getUserGroup(groupId: string): Promise<UserGroup> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("user_groups")
    .select("id, org_id, name, description, created_by, created_at, updated_at")
    .eq("id", groupId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch user group: ${error?.message}`);
  }

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    createdBy: data.created_by,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

/**
 * Create a user group.
 */
export async function createUserGroup(
  orgId: string,
  name: string,
  description?: string | null
): Promise<UserGroup> {
  await requireAdmin();
  const resolvedOrgId = await resolveOrgId(orgId);

  const { data, error } = await supabaseAdmin
    .from("user_groups")
    .insert({ org_id: resolvedOrgId, name, description: description ?? null })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user group: ${error?.message}`);
  }

  await logAdminAction({
    action: "user_group.create",
    targetType: "user_group",
    targetId: data.id,
    targetName: name,
    metadata: { orgId: resolvedOrgId },
  });

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    createdBy: data.created_by,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

/**
 * Update a user group.
 */
export async function updateUserGroup(
  groupId: string,
  updates: { name?: string; description?: string | null }
): Promise<void> {
  await requireAdmin();

  const { data: existing } = await supabaseAdmin
    .from("user_groups")
    .select("name")
    .eq("id", groupId)
    .single();

  if (!existing) {
    throw new Error("User group not found");
  }

  const updatePayload: Record<string, unknown> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.description !== undefined) updatePayload.description = updates.description;

  const { error } = await supabaseAdmin
    .from("user_groups")
    .update(updatePayload)
    .eq("id", groupId);

  if (error) {
    throw new Error(`Failed to update user group: ${error.message}`);
  }

  await logAdminAction({
    action: "user_group.update",
    targetType: "user_group",
    targetId: groupId,
    targetName: existing.name,
    metadata: { changedFields: Object.keys(updates) },
  });
}

/**
 * Delete a user group. Fails if members or project access exist.
 */
export async function deleteUserGroup(groupId: string): Promise<void> {
  await requireAdmin();

  const { data: existing } = await supabaseAdmin
    .from("user_groups")
    .select("name")
    .eq("id", groupId)
    .single();

  if (!existing) {
    throw new Error("User group not found");
  }

  const [{ count: memberCount }, { count: projectCount }] = await Promise.all([
    supabaseAdmin.from("group_memberships").select("*", { count: "exact", head: true }).eq("group_id", groupId),
    supabaseAdmin.from("project_group_access").select("*", { count: "exact", head: true }).eq("group_id", groupId),
  ]);

  if (memberCount && memberCount > 0) {
    throw new Error(`Cannot delete group: has ${memberCount} member(s)`);
  }

  if (projectCount && projectCount > 0) {
    throw new Error(`Cannot delete group: assigned to ${projectCount} project(s)`);
  }

  const { error } = await supabaseAdmin.from("user_groups").delete().eq("id", groupId);

  if (error) {
    throw new Error(`Failed to delete user group: ${error.message}`);
  }

  await logAdminAction({
    action: "user_group.delete",
    targetType: "user_group",
    targetId: groupId,
    targetName: existing.name,
  });
}

/**
 * Get members of a user group.
 */
export async function getGroupMembers(groupId: string): Promise<GroupMembership[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("group_id, clerk_user_id, joined_at, users(email, display_name)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch group members: ${error.message}`);
  }

  return (data || []).map((m) => {
    const userInfo = m.users as unknown as { email: string; display_name: string | null } | null;
    return {
      groupId: m.group_id,
      clerkUserId: m.clerk_user_id,
      joinedAt: m.joined_at ?? "",
      userEmail: userInfo?.email ?? null,
      userName: userInfo?.display_name ?? null,
    };
  });
}

/**
 * Add a user to a group.
 */
export async function addUserToGroup(groupId: string, clerkUserId: string): Promise<void> {
  await requireAdmin();

  const { data: group } = await supabaseAdmin
    .from("user_groups")
    .select("name, org_id")
    .eq("id", groupId)
    .single();

  const { error } = await supabaseAdmin
    .from("group_memberships")
    .insert({ group_id: groupId, clerk_user_id: clerkUserId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add user to group: ${error.message}`);
  }

  await logAdminAction({
    action: "user_group.member_add",
    targetType: "user_group",
    targetId: groupId,
    targetName: group?.name,
    metadata: { clerkUserId, orgId: group?.org_id },
  });
}

/**
 * Remove a user from a group.
 */
export async function removeUserFromGroup(groupId: string, clerkUserId: string): Promise<void> {
  await requireAdmin();

  const { data: group } = await supabaseAdmin
    .from("user_groups")
    .select("name, org_id")
    .eq("id", groupId)
    .single();

  const { error } = await supabaseAdmin
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    throw new Error(`Failed to remove user from group: ${error.message}`);
  }

  await logAdminAction({
    action: "user_group.member_remove",
    targetType: "user_group",
    targetId: groupId,
    targetName: group?.name,
    metadata: { clerkUserId, orgId: group?.org_id },
  });
}

/**
 * Get groups assigned to a project with role info.
 */
export async function getProjectGroups(projectId: string): Promise<ProjectGroupAccess[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("project_group_access")
    .select("id, project_id, group_id, role_id, assigned_by, assigned_at, user_groups(name), custom_roles(name)")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project groups: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    groupId: row.group_id,
    roleId: row.role_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at ?? "",
    groupName: (row.user_groups as unknown as { name: string } | null)?.name ?? "Unknown",
    roleName: (row.custom_roles as unknown as { name: string } | null)?.name ?? "Unknown",
  }));
}

/**
 * Assign a group to a project with a role.
 */
export async function assignGroupToProject(
  projectId: string,
  groupId: string,
  roleId: string
): Promise<void> {
  await requireAdmin();

  const { data: group } = await supabaseAdmin
    .from("user_groups")
    .select("name")
    .eq("id", groupId)
    .single();

  const { data: role } = await supabaseAdmin
    .from("custom_roles")
    .select("name")
    .eq("id", roleId)
    .single();

  const { error } = await supabaseAdmin
    .from("project_group_access")
    .insert({ project_id: projectId, group_id: groupId, role_id: roleId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to assign group to project: ${error.message}`);
  }

  await logAdminAction({
    action: "project_group_access.assign",
    targetType: "project_group_access",
    targetId: projectId,
    metadata: { groupId, groupName: group?.name, roleId, roleName: role?.name },
  });
}

/**
 * Remove a group from a project.
 */
export async function removeGroupFromProject(projectId: string, groupId: string): Promise<void> {
  await requireAdmin();

  const { data: group } = await supabaseAdmin
    .from("user_groups")
    .select("name")
    .eq("id", groupId)
    .single();

  const { error } = await supabaseAdmin
    .from("project_group_access")
    .delete()
    .eq("project_id", projectId)
    .eq("group_id", groupId);

  if (error) {
    throw new Error(`Failed to remove group from project: ${error.message}`);
  }

  await logAdminAction({
    action: "project_group_access.remove",
    targetType: "project_group_access",
    targetId: projectId,
    metadata: { groupId, groupName: group?.name },
  });
}
