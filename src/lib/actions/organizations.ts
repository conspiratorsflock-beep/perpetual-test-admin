"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";
import type { AdminOrganization, OrganizationWithDetails, OrgTier } from "@/types/admin";

interface SearchOrgsParams {
  query?: string;
  tier?: OrgTier;
  limit?: number;
  offset?: number;
}

/**
 * Search organizations with filtering.
 */
export async function searchOrganizations({
  query,
  tier,
  limit = 50,
  offset = 0,
}: SearchOrgsParams = {}): Promise<{ orgs: AdminOrganization[]; total: number }> {
  const client = await clerkClient();

  // Clerk's organization list doesn't support complex filtering
  // We'll fetch and filter in memory for now
  const response = await client.organizations.getOrganizationList({
    limit: 500, // Fetch enough for in-memory filtering
    offset: 0,  // Always start from 0; pagination applied after filtering
  });

  let orgs = response.data;

  // Filter by query if provided
  if (query) {
    const q = query.toLowerCase();
    orgs = orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }

  // Calculate pagination after filtering
  const total = orgs.length;
  orgs = orgs.slice(offset, offset + limit);

  // Map to our type (we'd normally fetch from our database for tier/MRR)
  const mappedOrgs: AdminOrganization[] = orgs.map((org) => ({
    id: org.id,
    clerkOrgId: org.id,
    name: org.name,
    slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
    memberCount: org.membersCount || 0,
    tier: "free", // Would come from database
    mrr: 0, // Would come from Stripe
    createdAt: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
  }));

  return { orgs: mappedOrgs, total };
}

/**
 * Get a single organization by ID with full details.
 */
export async function getOrganizationById(orgId: string): Promise<OrganizationWithDetails | null> {
  const client = await clerkClient();

  try {
    const org = await client.organizations.getOrganization({ organizationId: orgId });

    // Get members
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

    // Placeholder data - would come from database/Stripe
    return {
      id: org.id,
      clerkOrgId: org.id,
      name: org.name,
      slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
      memberCount: org.membersCount || 0,
      tier: "free",
      mrr: 0,
      createdAt: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
      members,
      projects: [], // Would fetch from database
      subscription: null, // Would fetch from Stripe
      usage: {
        apiCallsThisMonth: 0,
        storageUsedBytes: 0,
        lastActiveAt: null,
      },
    };
  } catch (error) {
    console.error("Failed to get organization:", error);
    return null;
  }
}

/**
 * Change an organization's tier.
 */
export async function changeOrgTier(
  orgId: string,
  newTier: OrgTier,
  reason?: string
): Promise<void> {
  // In a real implementation, this would:
  // 1. Update the tier in your database
  // 2. Potentially update Stripe subscription
  // 3. Log the action

  await logAdminAction({
    action: "org.tier_change",
    targetType: "organization",
    targetId: orgId,
    metadata: { newTier, reason },
  });
}

/**
 * Get total organization count for dashboard.
 */
export async function getTotalOrgCount(): Promise<number> {
  const client = await clerkClient();
  const response = await client.organizations.getOrganizationList({ limit: 1 });
  return response.totalCount;
}
