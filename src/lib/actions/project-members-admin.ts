"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { z } from "zod";
import { entityId, clerkId } from "@/lib/validation/common";
import type { ProjectMemberWithRole } from "@/types/admin";


const updateProjectMemberCustomRoleSchema = z.object({
  projectId: entityId,
  clerkUserId: clerkId,
  customRoleId: entityId.nullable(),
});

const removeProjectMemberSchema = z.object({
  projectId: entityId,
  clerkUserId: clerkId,
});

/**
 * Get project members enriched with custom role and group assignment info.
 */
export async function getProjectMembersWithRoles(
  projectId: string
): Promise<ProjectMemberWithRole[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("project_members")
    // NOTE: `project_members.role` was dropped in the RBAC migration; the member's
    // role now lives in the linked `custom_roles` row.
    .select(
      "clerk_user_id, email, display_name, custom_role_id, assigned_via_group_id, joined_at, custom_roles(name), user_groups(name)"
    )
    .eq("project_id", projectId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project members: ${error.message}`);
  }

  return (data || []).map((m) => {
    const customRoleName = (m.custom_roles as unknown as { name: string } | null)?.name ?? null;
    return {
      id: m.clerk_user_id,
      email: m.email,
      name: m.display_name,
      role: customRoleName ?? "member",
      customRoleId: m.custom_role_id,
      customRoleName,
      assignedViaGroupId: m.assigned_via_group_id,
      assignedViaGroupName: (m.user_groups as unknown as { name: string } | null)?.name ?? null,
      joinedAt: m.joined_at ?? "",
    };
  });
}

/**
 * Update a project member's custom role.
 */
export async function updateProjectMemberCustomRole(
  projectId: string,
  clerkUserId: string,
  customRoleId: string | null
): Promise<void> {
  await requireAdmin();
  const parsed = updateProjectMemberCustomRoleSchema.safeParse({ projectId, clerkUserId, customRoleId });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("email, display_name")
    .eq("project_id", projectId)
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!member) {
    throw new Error("Project member not found");
  }

  const { error } = await supabaseAdmin
    .from("project_members")
    .update({ custom_role_id: customRoleId })
    .eq("project_id", projectId)
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  await logAdminAction({
    action: "project_member.role_update",
    targetType: "project_member",
    targetId: clerkUserId,
    targetName: member.display_name || member.email,
    metadata: { projectId, customRoleId },
  });
}

/**
 * Remove a member from a project.
 */
export async function removeProjectMember(
  projectId: string,
  clerkUserId: string
): Promise<void> {
  await requireAdmin();
  const parsed = removeProjectMemberSchema.safeParse({ projectId, clerkUserId });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("email, display_name")
    .eq("project_id", projectId)
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!member) {
    throw new Error("Project member not found");
  }

  const { error } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    throw new Error(`Failed to remove project member: ${error.message}`);
  }

  await logAdminAction({
    action: "project_member.remove",
    targetType: "project_member",
    targetId: clerkUserId,
    targetName: member.display_name || member.email,
    metadata: { projectId },
  });
}
