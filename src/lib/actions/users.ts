"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/utils/csv";
import type { AdminUser, UserWithDetails, ProjectMembership } from "@/types/admin";

interface SearchUsersParams {
  query?: string;
  orgId?: string;
  isAdmin?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search users across Clerk with filtering.
 * Enriches with lathe-studio user data (billing owner flag).
 */
export async function searchUsers({
  query,
  orgId,
  isAdmin,
  limit = 50,
  offset = 0,
}: SearchUsersParams): Promise<{ users: AdminUser[]; total: number }> {
  const client = await clerkClient();

  const params: Record<string, string | number | boolean> = {
    limit,
    offset,
    orderBy: "-created_at",
  };

  if (query) {
    params.query = query;
  }

  const response = await client.users.getUserList(params);
  let users = response.data;

  // Filter by org membership if specified
  if (orgId) {
    const orgUsers = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
    const orgUserIds = new Set(orgUsers.data.map((m) => m.publicUserData?.userId));
    users = users.filter((u) => orgUserIds.has(u.id));
  }

  // Filter by admin status if specified
  if (isAdmin !== undefined) {
    users = users.filter(
      (u) => (u.publicMetadata as { isAdmin?: boolean })?.isAdmin === isAdmin
    );
  }

  // Enrich with lathe-studio billing owner flag
  const clerkIds = users.map((u) => u.id);
  const { data: dbUsers } = await supabaseAdmin
    .from("users")
    .select("clerk_user_id, is_billing_owner")
    .in("clerk_user_id", clerkIds);

  const dbUserMap = new Map(dbUsers?.map((u) => [u.clerk_user_id, u]) ?? []);

  const mappedUsers: AdminUser[] = users.map((user) => {
    const dbUser = dbUserMap.get(user.id);
    return {
      id: user.id,
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      isAdmin: (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      organizationId: null,
      organizationName: null,
      isBillingOwner: dbUser?.is_billing_owner ?? false,
    };
  });

  return { users: mappedUsers, total: response.totalCount };
}

/**
 * Get a single user by ID with full details.
 * Includes project memberships from lathe-studio.
 */
export async function getUserById(userId: string): Promise<UserWithDetails | null> {
  const client = await clerkClient();

  try {
    const user = await client.users.getUser(userId);

    // Get user's organizations from Clerk
    const orgMemberships = await client.users.getOrganizationMembershipList({
      userId: user.id,
    });

    const organizations = orgMemberships.data.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
    }));

    // Get lathe-studio user data
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("is_billing_owner, org_id")
      .eq("clerk_user_id", userId)
      .single();

    // Get project memberships from lathe-studio
    let projectMemberships: ProjectMembership[] = [];
    if (dbUser?.org_id) {
      const { data: projMembers } = await supabaseAdmin
        .from("project_members")
        // NOTE: role now comes from the linked custom_roles row (legacy `role` column dropped).
        .select("project_id, custom_roles(name), projects(name)")
        .eq("clerk_user_id", userId);

      projectMemberships =
        projMembers?.map((pm) => ({
          projectId: pm.project_id,
          projectName: (pm.projects as unknown as { name: string })?.name ?? "Unknown",
          role: ((pm.custom_roles as unknown as { name: string } | null)?.name ??
            "member") as ProjectMembership["role"],
        })) ?? [];
    }

    return {
      id: user.id,
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      isAdmin: (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      organizationId: organizations[0]?.id || null,
      organizationName: organizations[0]?.name || null,
      organizations,
      lastActivity: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      isBillingOwner: dbUser?.is_billing_owner ?? false,
      projectMemberships,
    };
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
}

/**
 * Update a user's basic information.
 */
export async function updateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    publicMetadata?: Record<string, unknown>;
  }
): Promise<void> {
  const client = await clerkClient();

  if (data.firstName !== undefined || data.lastName !== undefined) {
    await client.users.updateUser(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
    });
  }

  if (data.publicMetadata !== undefined) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: data.publicMetadata,
    });
  }

  await logAdminAction({
    action: "user.update",
    targetType: "user",
    targetId: userId,
    metadata: data,
  });
}

/**
 * Delete a user permanently.
 */
export async function deleteUser(userId: string): Promise<void> {
  const client = await clerkClient();

  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress || "unknown";

  await client.users.deleteUser(userId);

  await logAdminAction({
    action: "user.delete",
    targetType: "user",
    targetId: userId,
    targetName: email,
    metadata: { email },
  });
}

/**
 * Toggle admin status for a user.
 */
export async function toggleUserAdmin(userId: string, makeAdmin: boolean): Promise<void> {
  const client = await clerkClient();

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { isAdmin: makeAdmin },
  });

  await logAdminAction({
    action: makeAdmin ? "user.promote_admin" : "user.revoke_admin",
    targetType: "user",
    targetId: userId,
    metadata: { isAdmin: makeAdmin },
  });
}

/**
 * Get total user count for dashboard.
 */
export async function getTotalUserCount(): Promise<number> {
  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 1 });
  return response.totalCount;
}

/**
 * Create a new user in Clerk.
 */
export async function createUser({
  email,
  firstName,
  lastName,
  isAdmin = false,
  skipPasswordRequirement = false,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  skipPasswordRequirement?: boolean;
}): Promise<{ userId: string; email: string }> {
  const client = await clerkClient();

  try {
    const user = await client.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      publicMetadata: { isAdmin },
      skipPasswordRequirement,
    });

    await logAdminAction({
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      targetName: email,
      metadata: { email, firstName, lastName, isAdmin },
    });

    return { userId: user.id, email };
  } catch (error) {
    console.error("Failed to create user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create user");
  }
}

/**
 * Invite a user via email (sends invitation email).
 */
export async function inviteUser({
  email,
  firstName,
  lastName,
  isAdmin = false,
  orgId,
  role = "basic_member",
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  orgId?: string;
  role?: string;
}): Promise<{ invitationId: string; email: string }> {
  const client = await clerkClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL environment variable is not set. Cannot generate a valid invitation redirect URL."
    );
  }

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { isAdmin },
      redirectUrl: `${appUrl}/sign-up`,
    });

    if (orgId) {
      try {
        await client.organizations.createOrganizationInvitation({
          organizationId: orgId,
          emailAddress: email,
          role,
        });
      } catch (orgError) {
        console.warn("Failed to create org invitation:", orgError);
      }
    }

    await logAdminAction({
      action: "user.invite",
      targetType: "user",
      targetName: email,
      metadata: { email, firstName, lastName, isAdmin, orgId },
    });

    return { invitationId: invitation.id, email };
  } catch (error) {
    console.error("Failed to invite user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to invite user");
  }
}

/**
 * Export users to CSV.
 * Capped at 500 users to respect Clerk rate limits.
 */
export async function exportUsersToCSV(): Promise<string> {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");

  const client = await clerkClient();

  // Clerk getUserList max limit is 500; fetch in chunks of 100 up to 500.
  const allUsers: AdminUser[] = [];
  const chunkSize = 100;
  const maxUsers = 500;

  for (let offset = 0; offset < maxUsers; offset += chunkSize) {
    const response = await client.users.getUserList({
      limit: chunkSize,
      offset,
      orderBy: "-created_at",
    });
    if (response.data.length === 0) break;

    const clerkIds = response.data.map((u) => u.id);
    const { data: dbUsers } = await supabaseAdmin
      .from("users")
      .select("clerk_user_id, is_billing_owner")
      .in("clerk_user_id", clerkIds);

    const dbUserMap = new Map(dbUsers?.map((u) => [u.clerk_user_id, u]) ?? []);

    for (const user of response.data) {
      const dbUser = dbUserMap.get(user.id);
      allUsers.push({
        id: user.id,
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        isAdmin: (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
        organizationId: null,
        organizationName: null,
        isBillingOwner: dbUser?.is_billing_owner ?? false,
      });
    }

    if (response.data.length < chunkSize) break;
  }

  const headers = ["Email", "First Name", "Last Name", "Admin", "Billing Owner", "Created At"];
  const rows = allUsers.map((u) => [
    u.email,
    u.firstName ?? "",
    u.lastName ?? "",
    u.isAdmin ? "Yes" : "No",
    u.isBillingOwner ? "Yes" : "No",
    u.createdAt,
  ]);

  return toCsv(headers, rows);
}
