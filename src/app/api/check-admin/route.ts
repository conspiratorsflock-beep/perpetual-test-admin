import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
        message: `No user found with email: ${email}` 
      });
    }

    const user = users.data[0];
    const isAdmin = (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    return NextResponse.json({
      found: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      isAdmin,
      publicMetadata: user.publicMetadata,
      message: isAdmin ? "User is an admin" : "User is NOT an admin - use /setup-admin to promote",
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
