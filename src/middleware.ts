import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV_BYPASS = process.env.DEV_AUTH_BYPASS === "true";

// Dev bypass: no auth checks at all
async function devMiddleware() {
  return NextResponse.next();
}

// Real Clerk middleware (dynamically imported so it doesn't load in bypass mode)
let clerkMw: ((req: NextRequest) => Promise<Response>) | null = null;

async function initClerkMiddleware() {
  if (clerkMw) return;
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/unauthorized",
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
  }) as unknown as (req: NextRequest) => Promise<Response>;
}

export default async function middleware(req: NextRequest) {
  if (DEV_BYPASS) {
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
