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

    const isAdmin =
      (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // In production, admin pages require MFA. API routes are exempt here
    // because they return JSON and are gated separately by the admin checks
    // in each route handler; the plan's wording targets admin pages.
    const isApiRoute = req.nextUrl.pathname.startsWith("/api");
    if (!isApiRoute && process.env.NODE_ENV === "production") {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        if (!user.twoFactorEnabled) {
          return NextResponse.redirect(new URL("/mfa-required", req.url));
        }
      } catch {
        // Fail closed: if we cannot verify MFA enrollment, deny access.
        return NextResponse.redirect(new URL("/mfa-required", req.url));
      }
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
