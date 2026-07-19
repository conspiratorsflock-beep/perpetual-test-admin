import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isDevAuthBypassEnabled,
  assertNoBypassInProduction,
} from "@/lib/dev-auth/bypass";
import "@/lib/env";

assertNoBypassInProduction();

// Dev bypass: no auth checks at all
async function devMiddleware() {
  return NextResponse.next();
}

// Real Clerk middleware (dynamically imported so it doesn't load in bypass mode)
let clerkMw: ((req: NextRequest) => Promise<Response>) | null = null;

async function initClerkMiddleware() {
  if (clerkMw) return;
  const { clerkMiddleware, createRouteMatcher, clerkClient } = await import(
    "@clerk/nextjs/server",
  );
  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/unauthorized",
    "/mfa-required",
  ]);

  clerkMw = clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;

    const { userId, redirectToSignIn, sessionClaims } = await auth();

    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // Clerk's default session token does NOT carry publicMetadata — the claim
    // is only present if the instance customizes its session token, which this
    // repo must not depend on (dashboard config dependency). Treat the claim
    // as a fast-path only and resolve from the Backend API when it doesn't
    // prove admin. In production the same fetch also supplies the MFA posture,
    // so pages cost at most one users.getUser per request.
    const claimsSayAdmin =
      (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;
    const isApiRoute = req.nextUrl.pathname.startsWith("/api");
    const isProduction = process.env.NODE_ENV === "production";

    let isAdmin = claimsSayAdmin;
    let twoFactorEnabled: boolean | null = null; // null = not fetched

    if (!claimsSayAdmin || (isProduction && !isApiRoute)) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        isAdmin = (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;
        twoFactorEnabled = user.twoFactorEnabled === true;
      } catch {
        // Fail closed: if we cannot verify admin status, deny access.
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // In production, admin pages require MFA enrollment. API routes are
    // exempt here because they return JSON and are gated separately by the
    // admin checks in each route handler; the plan's wording targets pages.
    if (isProduction && !isApiRoute && twoFactorEnabled !== true) {
      return NextResponse.redirect(new URL("/mfa-required", req.url));
    }
  }) as unknown as (req: NextRequest) => Promise<Response>;
}

export default async function middleware(req: NextRequest) {
  if (isDevAuthBypassEnabled()) {
    return devMiddleware();
  }
  if (!clerkMw) await initClerkMiddleware();
  return clerkMw!(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
