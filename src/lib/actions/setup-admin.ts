"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";

const SETUP_SECRET = process.env.SETUP_ADMIN_SECRET;

async function promoteUser(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const client = await clerkClient();

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

    const isAlreadyAdmin =
      (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    if (isAlreadyAdmin) {
      return {
        success: true,
        message: `User ${email} is already an admin`,
      };
    }

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

/**
 * Promotes a user to admin by email.
 * Requires the caller to already be an admin.
 */
export async function promoteUserToAdminByEmail(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Unauthorized" };
  }
  return promoteUser(email);
}

/**
 * Emergency admin setup — bypasses admin check with a secret token.
 * Set SETUP_ADMIN_SECRET in your environment to use this.
 */
export async function setupEmergencyAdmin(secret: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!SETUP_SECRET) {
    return {
      success: false,
      message: "SETUP_ADMIN_SECRET is not configured on the server",
    };
  }

  if (secret !== SETUP_SECRET) {
    return {
      success: false,
      message: "Invalid setup secret",
    };
  }

  const email = "butteredpeanuts@gmail.com";
  return promoteUser(email);
}
