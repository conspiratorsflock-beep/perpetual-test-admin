"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import type { FeatureFlag } from "@/types/admin";

/**
 * Get all feature flags.
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
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
    enabledGlobally: row.enabled_globally,
    enabledForOrgs: row.enabled_for_orgs || [],
    enabledForUsers: row.enabled_for_users || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a single feature flag by ID.
 */
export async function getFeatureFlagById(id: string): Promise<FeatureFlag | null> {
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
    enabledGlobally: data.enabled_globally,
    enabledForOrgs: data.enabled_for_orgs || [],
    enabledForUsers: data.enabled_for_users || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
    enabledGlobally: row.enabled_globally,
    enabledForOrgs: row.enabled_for_orgs || [],
    enabledForUsers: row.enabled_for_users || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const { data, error } = await supabaseAdmin.rpc("is_feature_enabled", {
    flag_key: flagKey,
    user_id: userId || null,
    org_id: orgId || null,
  });

  if (error) {
    console.error("Failed to check feature flag:", error);
    return false;
  }

  return data || false;
}
