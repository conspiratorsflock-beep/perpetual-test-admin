"use server";

/**
 * Get Active Announcements - For the main Perpetual Test app
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

/**
 * Get all active announcements for display in the main app.
 * 
 * This fetches announcements that:
 * - Are marked as active
 * - Have started (starts_at <= now)
 * - Haven't ended yet (ends_at is null or in the future)
 * 
 * Client-side filtering should be done for:
 * - Tier targeting (target_tiers)
 * - Organization targeting (target_orgs)
 * - Dismissed announcements (localStorage)
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

  if (error) {
    console.error("Failed to fetch announcements:", error);
    return [];
  }

  // Filter out ended announcements in code as a safeguard
  const validData = (data || []).filter((row) => {
    if (!row.ends_at) return true;
    return new Date(row.ends_at) > new Date(now);
  });

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
    if (announcement.targetTiers.length > 0 && userTier) {
      if (!announcement.targetTiers.includes(userTier)) {
        return false;
      }
    }

    // Check org targeting
    if (announcement.targetOrgs.length > 0 && orgId) {
      if (!announcement.targetOrgs.includes(orgId)) {
        return false;
      }
    }

    return true;
  });
}
