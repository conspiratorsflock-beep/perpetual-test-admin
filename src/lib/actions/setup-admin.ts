"use server";

import { clerkClient } from "@clerk/nextjs/server";

/**
 * ONE-TIME SETUP: Promotes a user to admin by email.
 * Run this by calling it from a page or API route.
 * 
 * Usage: Call this from browser console or create a temporary page:
 * await promoteUserToAdminByEmail("butteredpeanuts@gmail.com");
 */
export async function promoteUserToAdminByEmail(email: string): Promise<{
  success: boolean;
  message: string;
}> {
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
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Emergency admin setup - call this to make butteredpeanuts@gmail.com an admin
 */
export async function setupEmergencyAdmin(): Promise<{
  success: boolean;
  message: string;
}> {
  return promoteUserToAdminByEmail("butteredpeanuts@gmail.com");
}
