import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { validateImpersonationToken } from "@/lib/actions/impersonation";

/**
 * POST /api/impersonate
 *
 * Validates an impersonation token and returns the target user info.
 * Token is accepted in the request body (not the URL) to avoid exposure in logs.
 * Called by the main app's middleware to handle impersonation.
 * Requires an authenticated admin session.
 */
export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const isAdmin =
    (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let token: string | undefined;
  try {
    const body = await request.json();
    token = body?.token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await validateImpersonationToken(token);

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Return the target user info — the main app uses this to create an impersonation session
  return NextResponse.json({
    success: true,
    targetUserId: result.targetUserId,
    adminId: result.adminId,
  });
}
