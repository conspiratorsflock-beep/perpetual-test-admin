import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/dev-auth/server";
import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";

function isAdminBootstrapAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_ADMIN_BOOTSTRAP === "true"
  );
}

/**
 * API route to promote a user to admin.
 * This requires the requesting user to already be an admin.
 *
 * Disabled in production unless ALLOW_ADMIN_BOOTSTRAP is explicitly set,
 * because admin accounts must be provisioned rather than self-promoted.
 */
export async function POST(request: NextRequest) {
  if (!isAdminBootstrapAllowed()) {
    return NextResponse.json(
      { error: "Admin bootstrap is disabled in production" },
      { status: 403 }
    );
  }

  try {
    // Check if the requesting user is authenticated and is an admin
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const isAdmin =
      (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Not authorized - admin access required" },
        { status: 403 }
      );
    }

    // Get the target user ID from the request body
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing targetUserId" },
        { status: 400 }
      );
    }

    // Promote the target user to admin
    const client = await clerkClient();
    const targetUser = await client.users.getUser(targetUserId);
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress || "unknown";

    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { isAdmin: true },
    });

    await logAdminAction({
      action: "user.promote_admin",
      targetType: "user",
      targetId: targetUserId,
      targetName: targetEmail,
      metadata: { source: "api/make-admin" },
    });

    return NextResponse.json({
      success: true,
      message: "User promoted to admin",
    });
  } catch (error) {
    console.error("Failed to promote user:", error);
    return NextResponse.json(
      { error: "Failed to promote user" },
      { status: 500 }
    );
  }
}
