"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { Permission, CustomRole } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

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
 * Get the full permissions catalog.
 */
export async function getPermissionsCatalog(): Promise<Permission[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("permissions")
    .select("id, resource, action, level, description, is_restricted")
    .order("resource", { ascending: true })
    .order("action", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch permissions catalog: ${error.message}`);
  }

  return (data || []).map((p) => ({
    id: p.id,
    resource: p.resource,
    action: p.action,
    level: p.level as Permission["level"],
    description: p.description,
    isRestricted: p.is_restricted ?? false,
  }));
}

/**
 * Get all custom roles (including system roles) for an organization.
 */
export async function getCustomRoles(orgId: string): Promise<CustomRole[]> {
  await requireAdmin();
  const resolvedOrgId = await resolveOrgId(orgId);

  const { data, error } = await supabaseAdmin
    .from("custom_roles")
    .select("id, org_id, name, description, template_role, is_system, system_role_key, created_by, created_at, updated_at")
    .eq("org_id", resolvedOrgId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch custom roles: ${error.message}`);
  }

  return (data || []).map((r) => ({
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    description: r.description,
    templateRole: r.template_role,
    isSystem: r.is_system,
    systemRoleKey: r.system_role_key as CustomRole["systemRoleKey"],
    createdBy: r.created_by,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  }));
}

/**
 * Get a single custom role with its permissions.
 */
export async function getCustomRole(roleId: string): Promise<CustomRole> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("custom_roles")
    .select("id, org_id, name, description, template_role, is_system, system_role_key, created_by, created_at, updated_at, role_permissions(permission_id)")
    .eq("id", roleId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch custom role: ${error?.message}`);
  }

  const permissionIds = (data.role_permissions as unknown as { permission_id: string }[] | undefined)?.map(
    (rp) => rp.permission_id
  ) ?? [];

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    templateRole: data.template_role,
    isSystem: data.is_system,
    systemRoleKey: data.system_role_key as CustomRole["systemRoleKey"],
    createdBy: data.created_by,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
    permissionIds,
  };
}

/**
 * Create a new custom role.
 */
export async function createCustomRole(
  orgId: string,
  name: string,
  description: string | null,
  permissionIds: string[],
  templateRole?: string
): Promise<CustomRole> {
  await requireAdmin();
  const resolvedOrgId = await resolveOrgId(orgId);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("custom_roles")
    .insert({
      org_id: resolvedOrgId,
      name,
      description,
      template_role: templateRole ?? null,
      is_system: false,
      system_role_key: null,
    })
    .select()
    .single();

  if (roleError || !roleData) {
    throw new Error(`Failed to create custom role: ${roleError?.message}`);
  }

  // Insert role permissions
  if (permissionIds.length > 0) {
    const { error: permError } = await supabaseAdmin
      .from("role_permissions")
      .insert(
        permissionIds.map((pid) => ({
          role_id: roleData.id,
          permission_id: pid,
        }))
      );

    if (permError) {
      // Attempt cleanup
      await supabaseAdmin.from("custom_roles").delete().eq("id", roleData.id);
      throw new Error(`Failed to assign permissions: ${permError.message}`);
    }
  }

  await logAdminAction({
    action: "custom_role.create",
    targetType: "custom_role",
    targetId: roleData.id,
    targetName: name,
    metadata: { orgId: resolvedOrgId, permissionCount: permissionIds.length },
  });

  return {
    id: roleData.id,
    orgId: roleData.org_id,
    name: roleData.name,
    description: roleData.description,
    templateRole: roleData.template_role,
    isSystem: roleData.is_system,
    systemRoleKey: roleData.system_role_key as CustomRole["systemRoleKey"],
    createdBy: roleData.created_by,
    createdAt: roleData.created_at ?? "",
    updatedAt: roleData.updated_at ?? "",
    permissionIds,
  };
}

/**
 * Update a custom role.
 */
export async function updateCustomRole(
  roleId: string,
  updates: {
    name?: string;
    description?: string | null;
    permissionIds?: string[];
  }
): Promise<void> {
  await requireAdmin();

  const { data: existing } = await supabaseAdmin
    .from("custom_roles")
    .select("name, is_system")
    .eq("id", roleId)
    .single();

  if (!existing) {
    throw new Error("Custom role not found");
  }

  if (existing.is_system) {
    throw new Error("Cannot modify system roles");
  }

  const updatePayload: Record<string, unknown> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.description !== undefined) updatePayload.description = updates.description;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabaseAdmin
      .from("custom_roles")
      .update(updatePayload)
      .eq("id", roleId);

    if (error) {
      throw new Error(`Failed to update custom role: ${error.message}`);
    }
  }

  if (updates.permissionIds !== undefined) {
    // Delete existing permissions and re-insert
    const { error: deleteError } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) {
      throw new Error(`Failed to update role permissions: ${deleteError.message}`);
    }

    if (updates.permissionIds.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("role_permissions")
        .insert(
          updates.permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: pid,
          }))
        );

      if (insertError) {
        throw new Error(`Failed to assign permissions: ${insertError.message}`);
      }
    }
  }

  await logAdminAction({
    action: "custom_role.update",
    targetType: "custom_role",
    targetId: roleId,
    targetName: existing.name,
    metadata: {
      changedFields: Object.keys(updates),
      permissionCount: updates.permissionIds?.length,
    },
  });
}

/**
 * Delete a custom role. Fails if assigned to any members.
 */
export async function deleteCustomRole(roleId: string): Promise<void> {
  await requireAdmin();

  const { data: existing } = await supabaseAdmin
    .from("custom_roles")
    .select("name, is_system")
    .eq("id", roleId)
    .single();

  if (!existing) {
    throw new Error("Custom role not found");
  }

  if (existing.is_system) {
    throw new Error("Cannot delete system roles");
  }

  // Check if assigned to any project members
  const { count, error: countError } = await supabaseAdmin
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("custom_role_id", roleId);

  if (countError) {
    throw new Error(`Failed to check role usage: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error(`Cannot delete role: assigned to ${count} project member(s)`);
  }

  const { error } = await supabaseAdmin
    .from("custom_roles")
    .delete()
    .eq("id", roleId);

  if (error) {
    throw new Error(`Failed to delete custom role: ${error.message}`);
  }

  await logAdminAction({
    action: "custom_role.delete",
    targetType: "custom_role",
    targetId: roleId,
    targetName: existing.name,
  });
}
