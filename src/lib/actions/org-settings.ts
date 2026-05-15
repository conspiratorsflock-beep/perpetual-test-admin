"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { OrgSettings } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

/**
 * Get org settings for a given org. Accepts Clerk org id and resolves to lathe-studio org id internally.
 */
export async function getOrgSettings(clerkOrgId: string): Promise<OrgSettings | null> {
  await requireAdmin();

  // Resolve lathe-studio org id from clerk org id
  const { data: dbOrg, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .single();

  if (orgErr || !dbOrg) {
    return null;
  }

  const orgUuid = dbOrg.id;

  const { data, error } = await supabaseAdmin
    .from("org_settings")
    .select("*")
    .eq("org_id", orgUuid)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found — return defaults
      return {
        id: "",
        orgId: orgUuid,
        featureRequirementsEnabled: true,
        require2fa: false,
        sessionTimeoutMinutes: 0,
        defaultNotificationChannel: "email",
        notifyOnRunComplete: true,
        notifyOnBuildStatusChange: true,
        defaultInheritancePolicy: "lenient",
        defaultCoverageTargetPct: 80,
        defaultEnvironment: "staging",
        updatedAt: new Date().toISOString(),
      };
    }
    throw new Error(`Failed to fetch org settings: ${error.message}`);
  }

  return {
    id: data.id,
    orgId: data.org_id,
    featureRequirementsEnabled: data.feature_requirements_enabled,
    require2fa: data.require_2fa,
    sessionTimeoutMinutes: data.session_timeout_minutes,
    defaultNotificationChannel: data.default_notification_channel,
    notifyOnRunComplete: data.notify_on_run_complete,
    notifyOnBuildStatusChange: data.notify_on_build_status_change,
    defaultInheritancePolicy: data.default_inheritance_policy,
    defaultCoverageTargetPct: data.default_coverage_target_pct,
    defaultEnvironment: data.default_environment,
    updatedAt: data.updated_at,
  };
}

/**
 * Update org settings. Accepts Clerk org id and resolves to lathe-studio org id internally.
 * Creates the row if it doesn't exist.
 */
export async function updateOrgSettings(
  clerkOrgId: string,
  partial: Partial<
    Omit<OrgSettings, "id" | "orgId" | "updatedAt">
  >
): Promise<void> {
  await requireAdmin();

  // Resolve lathe-studio org id from clerk org id
  const { data: dbOrg, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .single();

  if (orgErr || !dbOrg) {
    throw new Error("Organization not found in database");
  }

  const orgUuid = dbOrg.id;

  const dbPayload: Record<string, unknown> = {};
  if (partial.featureRequirementsEnabled !== undefined)
    dbPayload.feature_requirements_enabled = partial.featureRequirementsEnabled;
  if (partial.require2fa !== undefined) dbPayload.require_2fa = partial.require2fa;
  if (partial.sessionTimeoutMinutes !== undefined)
    dbPayload.session_timeout_minutes = partial.sessionTimeoutMinutes;
  if (partial.defaultNotificationChannel !== undefined)
    dbPayload.default_notification_channel = partial.defaultNotificationChannel;
  if (partial.notifyOnRunComplete !== undefined)
    dbPayload.notify_on_run_complete = partial.notifyOnRunComplete;
  if (partial.notifyOnBuildStatusChange !== undefined)
    dbPayload.notify_on_build_status_change = partial.notifyOnBuildStatusChange;
  if (partial.defaultInheritancePolicy !== undefined)
    dbPayload.default_inheritance_policy = partial.defaultInheritancePolicy;
  if (partial.defaultCoverageTargetPct !== undefined)
    dbPayload.default_coverage_target_pct = partial.defaultCoverageTargetPct;
  if (partial.defaultEnvironment !== undefined)
    dbPayload.default_environment = partial.defaultEnvironment;

  // Upsert: try update first, then insert if no row exists
  const { error: updateError } = await supabaseAdmin
    .from("org_settings")
    .update(dbPayload)
    .eq("org_id", orgUuid);

  if (updateError) {
    // If update failed because row doesn't exist, insert
    const { error: insertError } = await supabaseAdmin
      .from("org_settings")
      .insert({ org_id: orgUuid, ...dbPayload });

    if (insertError) {
      throw new Error(`Failed to update org settings: ${insertError.message}`);
    }
  }

  await logAdminAction({
    action: "org_setting.update",
    targetType: "org_setting",
    targetId: clerkOrgId,
    metadata: partial,
  });
}
