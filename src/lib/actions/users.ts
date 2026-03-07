"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";
import type { AdminUser, UserWithDetails } from "@/types/admin";

interface SearchUsersParams {
  query?: string;
  orgId?: string;
  isAdmin?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search users across Clerk with filtering.
 */
export async function searchUsers({
  query,
  orgId,
  isAdmin,
  limit = 50,
  offset = 0,
}: SearchUsersParams): Promise<{ users: AdminUser[]; total: number }> {
  const client = await clerkClient();

  // Build search parameters
  const params: Record<string, string | number | boolean> = {
    limit,
    offset,
    orderBy: "-created_at",
  };

  if (query) {
    // Clerk supports email and name search via query parameter
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

  const mappedUsers: AdminUser[] = users.map((user) => ({
    id: user.id,
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress || "",
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    isAdmin: (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
    organizationId: null, // Will be populated separately if needed
    organizationName: null,
  }));

  return { users: mappedUsers, total: response.totalCount };
}

/**
 * Get a single user by ID with full details.
 */
export async function getUserById(userId: string): Promise<UserWithDetails | null> {
  const client = await clerkClient();

  try {
    const user = await client.users.getUser(userId);

    // Get user's organizations
    const orgMemberships = await client.users.getOrganizationMembershipList({
      userId: user.id,
    });

    const organizations = orgMemberships.data.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
    }));

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

  await client.users.updateUser(userId, {
    firstName: data.firstName,
    lastName: data.lastName,
    publicMetadata: data.publicMetadata,
  });

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

  // Get user info before deletion for audit log
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
    // Create user with email
    const user = await client.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      publicMetadata: { isAdmin },
      // Skip password requirement - user will set password via email
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

  try {
    // Create invitation
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { isAdmin },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/sign-up`,
    });

    // If orgId provided, also create org invitation
    if (orgId) {
      try {
        await client.organizations.createOrganizationInvitation({
          organizationId: orgId,
          emailAddress: email,
          role,
        });
      } catch (orgError) {
        console.warn("Failed to create org invitation:", orgError);
        // Don't fail if org invitation fails
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
