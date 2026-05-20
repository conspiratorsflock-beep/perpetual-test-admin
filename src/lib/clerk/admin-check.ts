import { auth, clerkClient } from "@clerk/nextjs/server";

const DEV_BYPASS = process.env.DEV_AUTH_BYPASS === "true";

/**
 * Returns true if the currently signed-in user has isAdmin: true
 * in their Clerk publicMetadata.
 *
 * Use in Server Components or Route Handlers.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (DEV_BYPASS) return true;

  const { userId } = await auth();
  if (!userId) return false;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;
}

/**
 * Promotes a user to admin by setting isAdmin: true in publicMetadata.
 * Requires CLERK_SECRET_KEY with admin permissions.
 */
export async function promoteUserToAdmin(userId: string): Promise<void> {
  if (DEV_BYPASS) return;

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { isAdmin: true },
  });
}

/**
 * Revokes admin access for a user.
 */
export async function revokeUserAdmin(userId: string): Promise<void> {
  if (DEV_BYPASS) return;

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { isAdmin: false },
  });
}
