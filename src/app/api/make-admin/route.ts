import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * API route to promote a user to admin.
 * This requires the requesting user to already be an admin.
 */
export async function POST(request: NextRequest) {
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
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { isAdmin: true },
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
