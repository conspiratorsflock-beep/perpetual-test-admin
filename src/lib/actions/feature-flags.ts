"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { FeatureFlag } from "@/types/admin";


/**
 * Get all feature flags.
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch feature flags: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabledGlobally: row.enabled_globally ?? false,
    enabledForOrgs: row.enabled_for_orgs || [],
    enabledForUsers: row.enabled_for_users || [],
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  }));
}

/**
 * Get a single feature flag by ID.
 */
export async function getFeatureFlagById(id: string): Promise<FeatureFlag | null> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    key: data.key,
    name: data.name,
    description: data.description,
    enabledGlobally: data.enabled_globally ?? false,
    enabledForOrgs: data.enabled_for_orgs || [],
    enabledForUsers: data.enabled_for_users || [],
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

/**
 * Create a new feature flag.
 */
export async function createFeatureFlag(data: {
  key: string;
  name: string;
  description?: string;
  enabledGlobally?: boolean;
}): Promise<FeatureFlag> {
  await requireAdmin();
  const { data: row, error } = await supabaseAdmin
    .from("feature_flags")
    .insert({
      key: data.key,
      name: data.name,
      description: data.description || null,
      enabled_globally: data.enabledGlobally || false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create feature flag: ${error.message}`);
  }

  await logAdminAction({
    action: "feature_flag.create",
    targetType: "feature_flag",
    targetId: row.id,
    targetName: data.name,
    metadata: { key: data.key },
  });

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabledGlobally: row.enabled_globally ?? false,
    enabledForOrgs: row.enabled_for_orgs || [],
    enabledForUsers: row.enabled_for_users || [],
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/**
 * Update a feature flag.
 */
export async function updateFeatureFlag(
  id: string,
  data: {
    name?: string;
    description?: string;
    enabledGlobally?: boolean;
    enabledForOrgs?: string[];
    enabledForUsers?: string[];
  }
): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("feature_flags")
    .update({
      name: data.name,
      description: data.description,
      enabled_globally: data.enabledGlobally,
      enabled_for_orgs: data.enabledForOrgs,
      enabled_for_users: data.enabledForUsers,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update feature flag: ${error.message}`);
  }

  await logAdminAction({
    action: "feature_flag.update",
    targetType: "feature_flag",
    targetId: id,
    metadata: data,
  });
}

/**
 * Toggle global enable status.
 */
export async function toggleFeatureFlagGlobal(id: string, enabled: boolean): Promise<void> {
  await updateFeatureFlag(id, { enabledGlobally: enabled });
}

/**
 * Delete a feature flag.
 */
export async function deleteFeatureFlag(id: string): Promise<void> {
  await requireAdmin();
  const flag = await getFeatureFlagById(id);

  const { error } = await supabaseAdmin.from("feature_flags").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete feature flag: ${error.message}`);
  }

  await logAdminAction({
    action: "feature_flag.delete",
    targetType: "feature_flag",
    targetId: id,
    targetName: flag?.name,
  });
}

/**
 * Check if a feature is enabled for a specific user/org.
 */
export async function checkFeatureEnabled(
  flagKey: string,
  userId?: string,
  orgId?: string
): Promise<boolean> {
  // NOTE: the `is_feature_enabled` Postgres function isn't deployed to the shared DB,
  // so evaluate the flag directly against the feature_flags row.
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("enabled_globally, enabled_for_orgs, enabled_for_users")
    .eq("key", flagKey)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Failed to check feature flag:", error);
    return false;
  }

  if (data.enabled_globally) return true;
  if (orgId && (data.enabled_for_orgs ?? []).includes(orgId)) return true;
  if (userId && (data.enabled_for_users ?? []).includes(userId)) return true;
  return false;
}
