import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
  "/setup-admin",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn, sessionClaims } = await auth();

  // Not signed in — redirect to sign-in
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Signed in but not an admin — redirect to unauthorized
  const isAdmin =
    (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin === true;

  if (!isAdmin) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
