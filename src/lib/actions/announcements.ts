"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { AdminAnnouncement, AnnouncementType } from "@/types/admin";


function mapRow(row: Record<string, unknown>): AdminAnnouncement {
  return {
    id: row.id as string,
    message: row.message as string,
    style: row.style as AnnouncementType,
    tier: (row.tier as string) || "all",
    orgId: (row.org_id as string) || null,
    linkUrl: (row.link_url as string) || null,
    linkText: (row.link_text as string) || null,
    startsAt: row.starts_at as string,
    endsAt: (row.ends_at as string) || null,
    createdBy: (row.created_by as string) || "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Get all announcements.
 */
export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("admin_announcements")
    .select("id, message, style, tier, org_id, link_url, link_text, starts_at, ends_at, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }

  return (data || []).map(mapRow);
}

/**
 * Get active announcements (for display in main app).
 * Active = starts_at <= now AND (ends_at IS NULL OR ends_at > now)
 */
export async function getActiveAnnouncements(): Promise<AdminAnnouncement[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("admin_announcements")
    .select("id, message, style, tier, org_id, link_url, link_text, starts_at, ends_at, created_by, created_at, updated_at")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active announcements: ${error.message}`);
  }

  // Safeguard: also drop ended announcements in code (defense-in-depth alongside the DB filter).
  const active = (data || []).filter((row) => !row.ends_at || new Date(row.ends_at) > new Date(now));

  return active.map(mapRow);
}

/**
 * Create a new announcement.
 */
export async function createAnnouncement(
  data: {
    message: string;
    style: AnnouncementType;
    tier?: string;
    orgId?: string | null;
    linkUrl?: string | null;
    linkText?: string | null;
    startsAt?: string;
    endsAt?: string | null;
  },
  createdBy: string
): Promise<AdminAnnouncement> {
  await requireAdmin();
  const { data: row, error } = await supabaseAdmin
    .from("admin_announcements")
    .insert({
      message: data.message,
      style: data.style,
      tier: data.tier || "all",
      org_id: data.orgId || null,
      link_url: data.linkUrl ?? null,
      link_text: data.linkText ?? null,
      starts_at: data.startsAt || new Date().toISOString(),
      ends_at: data.endsAt || null,
      created_by: createdBy,
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
    targetName: data.message.slice(0, 100),
    metadata: { style: data.style, tier: data.tier },
  });

  return mapRow(row);
}

/**
 * Update an announcement.
 */
export async function updateAnnouncement(
  id: string,
  data: {
    message?: string;
    style?: AnnouncementType;
    tier?: string;
    orgId?: string | null;
    linkUrl?: string | null;
    linkText?: string | null;
    startsAt?: string;
    endsAt?: string | null;
  }
): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("admin_announcements")
    .update({
      message: data.message,
      style: data.style,
      tier: data.tier,
      org_id: data.orgId,
      link_url: data.linkUrl,
      link_text: data.linkText,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
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
 * Expire an announcement immediately (set ends_at to now).
 */
export async function expireAnnouncementNow(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("admin_announcements")
    .update({ ends_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to expire announcement: ${error.message}`);
  }

  await logAdminAction({
    action: "announcement.expire",
    targetType: "announcement",
    targetId: id,
  });
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin();
  const { data: row } = await supabaseAdmin
    .from("admin_announcements")
    .select("message")
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
    targetName: row?.message?.slice(0, 100),
  });
}
