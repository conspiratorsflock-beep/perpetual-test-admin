"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin, requireAdmin } from "@/lib/clerk/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/utils/csv";
import type { AdminOrganization, OrganizationWithDetails, TrialLockState, OrgApiUsage } from "@/types/admin";


interface SearchOrgsParams {
  query?: string;
  trialState?: TrialLockState;
  limit?: number;
  offset?: number;
}

/**
 * Search organizations with filtering.
 * Joins Clerk data with lathe-studio's organizations table.
 */
export async function searchOrganizations({
  query,
  trialState,
  limit = 50,
  offset = 0,
}: SearchOrgsParams = {}): Promise<{ orgs: AdminOrganization[]; total: number }> {
  await requireAdmin();
  const client = await clerkClient();

  const params: Record<string, string | number> = { limit, offset };
  if (query) params.query = query;

  const response = await client.organizations.getOrganizationList(params);
  let orgs = response.data;

  // Fetch lathe-studio org data for all results
  const clerkOrgIds = orgs.map((o) => o.id);
  const { data: dbOrgs, error: dbOrgsError } = await supabaseAdmin
    .from("organizations")
    .select("clerk_org_id, trial_lock_state, trial_started_at, trial_ends_at, trial_extension_used, stripe_customer_id, stripe_subscription_id, stripe_price_id")
    .in("clerk_org_id", clerkOrgIds);

  // A swallowed error here would render every org as "active" — fail loudly instead
  if (dbOrgsError) {
    throw new Error(`Failed to fetch organization data: ${dbOrgsError.message}`);
  }

  const dbOrgMap = new Map(dbOrgs?.map((o) => [o.clerk_org_id, o]) ?? []);

  const mappedOrgs: AdminOrganization[] = orgs.map((org) => {
    const dbOrg = dbOrgMap.get(org.id);
    return {
      id: org.id,
      clerkOrgId: org.id,
      name: org.name,
      slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
      memberCount: org.membersCount || 0,
      trialLockState: (dbOrg?.trial_lock_state as TrialLockState) || "active",
      trialStartedAt: dbOrg?.trial_started_at ?? null,
      trialEndsAt: dbOrg?.trial_ends_at ?? null,
      trialExtensionUsed: dbOrg?.trial_extension_used ?? false,
      stripeCustomerId: dbOrg?.stripe_customer_id ?? null,
      stripeSubscriptionId: dbOrg?.stripe_subscription_id ?? null,
      stripePriceId: dbOrg?.stripe_price_id ?? null,
      mrr: 0, // Calculated from Stripe separately
      apiMonthlyQuota: null,
      createdAt: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  // Filter by trial state if specified
  let filtered = mappedOrgs;
  if (trialState) {
    filtered = mappedOrgs.filter((o) => o.trialLockState === trialState);
  }

  const total = trialState ? filtered.length : response.totalCount;
  const paginated = trialState ? filtered.slice(offset, offset + limit) : filtered;

  return { orgs: paginated, total };
}

/**
 * Get a single organization by ID with full details.
 */
export async function getOrganizationById(orgId: string): Promise<OrganizationWithDetails | null> {
  await requireAdmin();
  const client = await clerkClient();

  try {
    const org = await client.organizations.getOrganization({ organizationId: orgId });

    // Get members from Clerk
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const members = memberships.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      email: m.publicUserData?.identifier || "",
      firstName: m.publicUserData?.firstName || null,
      lastName: m.publicUserData?.lastName || null,
      role: m.role,
      joinedAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    }));

    // Get lathe-studio org data
    const { data: dbOrg } = await supabaseAdmin
      .from("organizations")
      .select("id, trial_lock_state, trial_started_at, trial_ends_at, trial_extension_used, stripe_customer_id, stripe_subscription_id, stripe_price_id, api_monthly_quota")
      .eq("clerk_org_id", orgId)
      .single();

    // Resolve DB org UUID once and reuse
    const orgUuid = dbOrg ? await getOrgUuidFromClerkId(orgId) : null;

    // Get projects from lathe-studio
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name, created_at")
      .eq("org_id", orgUuid ?? "")
      .is("deleted_at", null);

    // Get usage stats
    const { count: apiCalls } = await supabaseAdmin
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgUuid ?? "")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return {
      id: org.id,
      clerkOrgId: org.id,
      name: org.name,
      slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
      memberCount: org.membersCount || 0,
      trialLockState: (dbOrg?.trial_lock_state as TrialLockState) || "active",
      trialStartedAt: dbOrg?.trial_started_at ?? null,
      trialEndsAt: dbOrg?.trial_ends_at ?? null,
      trialExtensionUsed: dbOrg?.trial_extension_used ?? false,
      stripeCustomerId: dbOrg?.stripe_customer_id ?? null,
      stripeSubscriptionId: dbOrg?.stripe_subscription_id ?? null,
      stripePriceId: dbOrg?.stripe_price_id ?? null,
      mrr: 0,
      apiMonthlyQuota: dbOrg?.api_monthly_quota ?? null,
      createdAt: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
      members,
      projects: projects?.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at ?? "",
      })) ?? [],
      subscription: dbOrg?.stripe_subscription_id
        ? {
            id: dbOrg.stripe_subscription_id,
            stripeSubscriptionId: dbOrg.stripe_subscription_id,
            stripeCustomerId: dbOrg.stripe_customer_id,
            status: dbOrg.trial_lock_state === "paid" ? "active" : "trialing",
            currentPeriodStart: dbOrg.trial_started_at ?? new Date().toISOString(),
            currentPeriodEnd: dbOrg.trial_ends_at ?? new Date().toISOString(),
            cancelAtPeriodEnd: false,
          }
        : null,
      usage: {
        apiCallsThisMonth: apiCalls ?? 0,
        storageUsedBytes: 0,
        lastActiveAt: null,
      },
      dbOrgId: dbOrg?.id ?? null,
    };
  } catch (error) {
    console.error("Failed to get organization:", error);
    return null;
  }
}

/**
 * Change an organization's trial state.
 */
export async function changeTrialState(
  orgId: string,
  newState: TrialLockState,
  reason?: string
): Promise<void> {
  await requireAdmin();

  const orgUuid = await getOrgUuidFromClerkId(orgId);
  if (!orgUuid) {
    throw new Error("Organization not found in database");
  }

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ trial_lock_state: newState })
    .eq("id", orgUuid);

  if (error) {
    throw new Error(`Failed to update trial state: ${error.message}`);
  }

  await logAdminAction({
    action: "org.trial_state_change",
    targetType: "organization",
    targetId: orgId,
    metadata: { newState, reason },
  });
}

/**
 * Extend an organization's trial by N days.
 * Enforces a one-time-only extension policy.
 */
export async function extendTrial(orgId: string, days: number): Promise<{ newTrialEndsAt: string }> {
  await requireAdmin();

  const orgUuid = await getOrgUuidFromClerkId(orgId);
  if (!orgUuid) {
    throw new Error("Organization not found in database");
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("trial_ends_at, trial_extension_used, trial_lock_state")
    .eq("id", orgUuid)
    .single();

  if (!org) {
    throw new Error("Organization not found");
  }

  if (org.trial_lock_state === "paid") {
    throw new Error("Cannot extend trial for a paid organization");
  }

  if (org.trial_extension_used) {
    throw new Error("Trial extension already used. Internal policy allows one extension only.");
  }

  const currentEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
  const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
  const newTrialEndsAt = newEnd.toISOString();

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      trial_ends_at: newTrialEndsAt,
      trial_extension_used: true,
    })
    .eq("id", orgUuid);

  if (error) {
    throw new Error(`Failed to extend trial: ${error.message}`);
  }

  await logAdminAction({
    action: "org.extend_trial",
    targetType: "organization",
    targetId: orgId,
    metadata: { days, previousEnd: org.trial_ends_at, newEnd: newTrialEndsAt },
  });

  return { newTrialEndsAt };
}

/**
 * Update an organization's API monthly quota.
 */
export async function updateOrgApiQuota(clerkOrgId: string, apiMonthlyQuota: number | null): Promise<void> {
  await requireAdmin();

  const orgUuid = await getOrgUuidFromClerkId(clerkOrgId);
  if (!orgUuid) {
    throw new Error("Organization not found in database");
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", orgUuid)
    .single();

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ api_monthly_quota: apiMonthlyQuota })
    .eq("id", orgUuid);

  if (error) {
    throw new Error(`Failed to update org API quota: ${error.message}`);
  }

  await logAdminAction({
    action: "organization.api_quota_update",
    targetType: "organization",
    targetId: clerkOrgId,
    targetName: org?.name,
    metadata: { apiMonthlyQuota },
  });
}

/**
 * Get org API usage rollup.
 */
export async function getOrgApiUsage(orgId: string): Promise<OrgApiUsage[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("org_api_usage")
    // NOTE: org_api_usage stores a combined `year_month` ("YYYY-MM"); per-period token
    // counts are not tracked in this table (totalTokens reported as 0).
    .select("org_id, year_month, total_calls, updated_at")
    .eq("org_id", orgId)
    .order("year_month", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch org API usage: ${error.message}`);
  }

  return (data || []).map((row) => {
    const [year, month] = (row.year_month ?? "0-0").split("-").map((n) => parseInt(n, 10));
    return {
      orgId: row.org_id,
      month: month || 0,
      year: year || 0,
      totalCalls: row.total_calls,
      totalTokens: 0,
      updatedAt: row.updated_at ?? "",
    };
  });
}

/**
 * Get trial metrics for the dashboard.
 */
export async function getTrialMetrics(): Promise<{
  activeTrials: number;
  softLocked: number;
  hardLocked: number;
  paid: number;
  conversionRate: number;
}> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("trial_lock_state");

  if (error || !data) {
    return { activeTrials: 0, softLocked: 0, hardLocked: 0, paid: 0, conversionRate: 0 };
  }

  const counts = {
    active: 0,
    soft_locked: 0,
    hard_locked: 0,
    paid: 0,
  };

  for (const row of data) {
    const state = row.trial_lock_state as TrialLockState;
    if (state in counts) {
      counts[state as keyof typeof counts]++;
    }
  }

  const total = data.length;
  const conversionRate = total > 0 ? Math.round((counts.paid / total) * 1000) / 10 : 0;

  return {
    activeTrials: counts.active,
    softLocked: counts.soft_locked,
    hardLocked: counts.hard_locked,
    paid: counts.paid,
    conversionRate,
  };
}

/**
 * Get total organization count for dashboard.
 */
export async function getTotalOrgCount(): Promise<number> {
  await requireAdmin();
  const client = await clerkClient();
  const response = await client.organizations.getOrganizationList({ limit: 1 });
  return response.totalCount;
}

/**
 * Count organizations with active trials expiring within the next 7 days.
 */
export async function getTrialsExpiringSoon(): Promise<number> {
  await requireAdmin();
  const now = new Date().toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("organizations")
    .select("*", { count: "exact", head: true })
    .eq("trial_lock_state", "active")
    .gte("trial_ends_at", now)
    .lte("trial_ends_at", sevenDaysFromNow);

  if (error) {
    console.error("Failed to get trials expiring soon:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Export organizations to CSV.
 * Capped at 500 orgs to respect Clerk rate limits.
 */
export async function exportOrganizationsToCSV(): Promise<string> {
  await requireAdmin();
  const client = await clerkClient();

  const allOrgs: AdminOrganization[] = [];
  const chunkSize = 100;
  const maxOrgs = 500;

  for (let offset = 0; offset < maxOrgs; offset += chunkSize) {
    const response = await client.organizations.getOrganizationList({
      limit: chunkSize,
      offset,
    });
    if (response.data.length === 0) break;

    const clerkOrgIds = response.data.map((o) => o.id);
    const { data: dbOrgs, error: dbOrgsError } = await supabaseAdmin
      .from("organizations")
      .select(
        "clerk_org_id, trial_lock_state, trial_started_at, trial_ends_at, trial_extension_used, stripe_customer_id, stripe_subscription_id, stripe_price_id"
      )
      .in("clerk_org_id", clerkOrgIds);

    // Exported CSVs must never carry silently-defaulted trial states
    if (dbOrgsError) {
      throw new Error(`Failed to fetch organization data for export: ${dbOrgsError.message}`);
    }

    const dbOrgMap = new Map(dbOrgs?.map((o) => [o.clerk_org_id, o]) ?? []);

    for (const org of response.data) {
      const dbOrg = dbOrgMap.get(org.id);
      allOrgs.push({
        id: org.id,
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
        memberCount: org.membersCount || 0,
        trialLockState: (dbOrg?.trial_lock_state as TrialLockState) || "active",
        trialStartedAt: dbOrg?.trial_started_at ?? null,
        trialEndsAt: dbOrg?.trial_ends_at ?? null,
        trialExtensionUsed: dbOrg?.trial_extension_used ?? false,
        stripeCustomerId: dbOrg?.stripe_customer_id ?? null,
        stripeSubscriptionId: dbOrg?.stripe_subscription_id ?? null,
        stripePriceId: dbOrg?.stripe_price_id ?? null,
        mrr: 0,
        apiMonthlyQuota: null,
        createdAt: org.createdAt
          ? new Date(org.createdAt).toISOString()
          : new Date().toISOString(),
      });
    }

    if (response.data.length < chunkSize) break;
  }

  const headers = [
    "Name",
    "Slug",
    "Trial State",
    "Trial Ends At",
    "Members",
    "Stripe Subscription ID",
    "Created At",
  ];
  const rows = allOrgs.map((o) => [
    o.name,
    o.slug,
    o.trialLockState,
    o.trialEndsAt ?? "",
    o.memberCount,
    o.stripeSubscriptionId ?? "",
    o.createdAt,
  ]);

  return toCsv(headers, rows);
}

/**
 * Helper: Convert Clerk org ID to lathe-studio UUID.
 */
async function getOrgUuidFromClerkId(clerkOrgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .single();
  return data?.id ?? null;
}
