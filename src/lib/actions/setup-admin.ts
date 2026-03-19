"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";

/**
 * Promotes a user to admin by email.
 * Requires the caller to already be an admin.
 * To bootstrap the very first admin, set isAdmin: true manually in the Clerk Dashboard
 * under Users → select user → Public Metadata.
 */
export async function promoteUserToAdminByEmail(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const client = await clerkClient();

    // Find user by email
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      return {
        success: false,
        message: `User with email ${email} not found`,
      };
    }

    const user = users.data[0];

    // Check if already admin
    const isAlreadyAdmin =
      (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    if (isAlreadyAdmin) {
      return {
        success: true,
        message: `User ${email} is already an admin`,
      };
    }

    // Promote to admin
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: { isAdmin: true },
    });

    return {
      success: true,
      message: `Successfully promoted ${email} to admin`,
    };
  } catch (error) {
    console.error("Failed to promote user:", error);
    return {
      success: false,
      message: "Failed to promote user",
    };
  }
}
