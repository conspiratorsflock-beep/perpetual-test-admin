"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin, requireAdmin } from "@/lib/clerk/admin-check";
import type { ApiKey } from "@/types/admin";


interface SearchApiKeysParams {
  orgId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search API keys with filtering.
 */
export async function searchApiKeys({
  orgId,
  projectId,
  limit = 50,
  offset = 0,
}: SearchApiKeysParams = {}): Promise<{ keys: ApiKey[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("api_keys")
    .select("*, organizations(name)", { count: "exact" })
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }

  const keys: ApiKey[] = (data || []).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    projectId: row.project_id,
    name: row.name,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    scopes: row.scopes || [],
    rateLimitPerMinute: row.rate_limit_per_minute ?? 0,
    monthlyQuotaOverride: row.monthly_quota_override ?? null,
    monthlyUsage: row.monthly_usage ?? 0,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }));

  return { keys, total: count ?? 0 };
}

/**
 * Update an API key's monthly quota override.
 */
export async function updateApiKeyQuota(keyId: string, monthlyQuotaOverride: number | null): Promise<void> {
  await requireAdmin();

  const { data: key } = await supabaseAdmin
    .from("api_keys")
    .select("name, org_id")
    .eq("id", keyId)
    .single();

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ monthly_quota_override: monthlyQuotaOverride })
    .eq("id", keyId);

  if (error) {
    throw new Error(`Failed to update API key quota: ${error.message}`);
  }

  await logAdminAction({
    action: "api_key.quota_update",
    targetType: "api_key",
    targetId: keyId,
    targetName: key?.name,
    metadata: { orgId: key?.org_id, monthlyQuotaOverride },
  });
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  await requireAdmin();

  const { data: key } = await supabaseAdmin
    .from("api_keys")
    .select("name, org_id")
    .eq("id", keyId)
    .single();

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }

  await logAdminAction({
    action: "api_key.revoke",
    targetType: "api_key",
    targetId: keyId,
    targetName: key?.name,
    metadata: { orgId: key?.org_id },
  });
}
