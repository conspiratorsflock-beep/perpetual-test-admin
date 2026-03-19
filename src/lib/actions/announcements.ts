"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { AdminAnnouncement, AnnouncementType } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

/**
 * Get all announcements.
 */
export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("admin_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type as AnnouncementType,
    targetTiers: row.target_tiers || [],
    targetOrgs: row.target_orgs || [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get active announcements (for display in main app).
 */
export async function getActiveAnnouncements(): Promise<AdminAnnouncement[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("admin_announcements")
    .select("*")
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false });
    
  // Filter out ended announcements in code as a safeguard
  const validData = (data || []).filter((row) => {
    if (!row.ends_at) return true;
    return new Date(row.ends_at) > new Date(now);
  });

  if (error) {
    throw new Error(`Failed to fetch active announcements: ${error.message}`);
  }

  return validData.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type as AnnouncementType,
    targetTiers: row.target_tiers || [],
    targetOrgs: row.target_orgs || [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Create a new announcement.
 */
export async function createAnnouncement(
  data: {
    title: string;
    content: string;
    type: AnnouncementType;
    targetTiers?: string[];
    targetOrgs?: string[];
    startsAt?: string;
    endsAt?: string | null;
  },
  createdBy: string,
  createdByEmail: string
): Promise<AdminAnnouncement> {
  await requireAdmin();
  const { data: row, error } = await supabaseAdmin
    .from("admin_announcements")
    .insert({
      title: data.title,
      content: data.content,
      type: data.type,
      target_tiers: data.targetTiers || [],
      target_orgs: data.targetOrgs || [],
      starts_at: data.startsAt || new Date().toISOString(),
      ends_at: data.endsAt || null,
      is_active: true,
      created_by: createdBy,
      created_by_email: createdByEmail,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create announcement: ${error.message}`);
  }

  await logAdminAction({
    action: "announcement.create",
    targetType: "announcement",
    targetId: row.id,
    targetName: data.title,
    metadata: { type: data.type },
  });

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type as AnnouncementType,
    targetTiers: row.target_tiers || [],
    targetOrgs: row.target_orgs || [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update an announcement.
 */
export async function updateAnnouncement(
  id: string,
  data: {
    title?: string;
    content?: string;
    type?: AnnouncementType;
    targetTiers?: string[];
    targetOrgs?: string[];
    startsAt?: string;
    endsAt?: string | null;
    isActive?: boolean;
  }
): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("admin_announcements")
    .update({
      title: data.title,
      content: data.content,
      type: data.type,
      target_tiers: data.targetTiers,
      target_orgs: data.targetOrgs,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      is_active: data.isActive,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update announcement: ${error.message}`);
  }

  await logAdminAction({
    action: "announcement.update",
    targetType: "announcement",
    targetId: id,
    metadata: data,
  });
}

/**
 * Toggle announcement active status.
 */
export async function toggleAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  await updateAnnouncement(id, { isActive });
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin();
  const { data: row } = await supabaseAdmin
    .from("admin_announcements")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("admin_announcements").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete announcement: ${error.message}`);
  }

  await logAdminAction({
    action: "announcement.delete",
    targetType: "announcement",
    targetId: id,
    targetName: row?.title,
  });
}
