"use server";

/**
 * Get Active Announcements - For the main Lathe Studio app
 *
 * This server action fetches active announcements from the admin console database.
 * Copy this file to your main app and update the import path for supabaseAdmin.
 */

import { createClient } from "@supabase/supabase-js";
import type { AdminAnnouncement, AnnouncementType } from "./admin-banner";

// Use your main app's Supabase client
// In your main app, replace this with your own Supabase client import
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
 * Get all active announcements for display in the main app.
 *
 * This fetches announcements that:
 * - Have started (starts_at <= now)
 * - Haven't ended yet (ends_at is null or in the future)
 *
 * Client-side filtering should be done for:
 * - Tier targeting (tier)
 * - Organization targeting (org_id)
 * - Dismissed announcements (localStorage)
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
    console.error("Failed to fetch announcements:", error);
    return [];
  }

  return (data || []).map(mapRow);
}

/**
 * Get announcements filtered by tier and org.
 * Use this if you want server-side filtering.
 */
export async function getAnnouncementsForUser(
  userTier?: string,
  orgId?: string
): Promise<AdminAnnouncement[]> {
  const allAnnouncements = await getActiveAnnouncements();

  return allAnnouncements.filter((announcement) => {
    // Check tier targeting
    if (announcement.tier && announcement.tier !== "all" && userTier) {
      if (announcement.tier !== userTier) {
        return false;
      }
    }

    // Check org targeting
    if (announcement.orgId && orgId) {
      if (announcement.orgId !== orgId) {
        return false;
      }
    }

    return true;
  });
}
