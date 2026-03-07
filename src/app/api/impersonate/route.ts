import { NextRequest, NextResponse } from "next/server";
import { validateImpersonationToken } from "@/lib/actions/impersonation";

/**
 * API route to validate an impersonation token and redirect to the main app.
 * This would be called by the main app's middleware to handle impersonation.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await validateImpersonationToken(token);

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Return the target user info - the main app would use this to create
  // an impersonation session
  return NextResponse.json({
    success: true,
    targetUserId: result.targetUserId,
    adminId: result.adminId,
  });
}
