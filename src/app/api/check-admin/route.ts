import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Require authenticated admin
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const isCallerAdmin =
    (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

  if (!isCallerAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });

    if (users.data.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No user found with email: ${email}`,
      });
    }

    const user = users.data[0];
    const isAdmin = (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    return NextResponse.json({
      found: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      isAdmin,
      message: isAdmin ? "User is an admin" : "User is NOT an admin - use /setup-admin to promote",
    });
  } catch (error) {
    console.error("Failed to check admin status:", error);
    return NextResponse.json({ error: "Failed to check admin status" }, { status: 500 });
  }
}
