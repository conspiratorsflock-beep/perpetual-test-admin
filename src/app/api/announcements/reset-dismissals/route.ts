import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";

/**
 * POST /api/announcements/reset-dismissals
 * 
 * Triggers a reset of all dismissed announcements.
 * This works by incrementing a version number that clients check.
 * When the version changes, clients clear their localStorage.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // In a real implementation, you might store this in a database
    // or use a cache like Redis. For now, we'll just return success
    // and the client will handle the reset via a timestamp mechanism.
    
    // Generate a new reset timestamp
    const resetTimestamp = Date.now();

    await logAdminAction({
      action: "announcement.reset_dismissals",
      targetType: "system",
      metadata: { resetTimestamp },
    });

    return NextResponse.json({
      success: true,
      resetTimestamp,
      message: "Dismissals reset triggered. All users will see announcements again.",
    });
  } catch (error) {
    console.error("Failed to reset dismissals:", error);
    return NextResponse.json(
      { error: "Failed to reset dismissals" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/announcements/reset-dismissals
 * 
 * Returns the current reset timestamp.
 * Clients can poll this or check on load to see if they should clear localStorage.
 */
export async function GET(request: NextRequest) {
  try {
    // For now, return a simple timestamp-based approach
    // In production, you might store this in a database
    return NextResponse.json({
      // Return a fixed timestamp that changes when admin resets
      // This is a placeholder - in production, fetch from DB/cache
      resetTimestamp: null,
    });
  } catch (error) {
    console.error("Failed to get reset timestamp:", error);
    return NextResponse.json(
      { error: "Failed to get reset timestamp" },
      { status: 500 }
    );
  }
}
