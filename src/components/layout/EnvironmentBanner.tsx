"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/unauthorized", "/mfa-required"];

export function EnvironmentBanner() {
  const label = process.env.NEXT_PUBLIC_ENV_LABEL;
  const pathname = usePathname();

  if (!label) {
    return null;
  }

  const normalized = label.toUpperCase();

  let bannerClasses =
    "fixed left-0 right-0 top-0 z-50 border-b px-4 py-1.5 text-center text-xs font-medium";

  if (normalized === "STAGING") {
    bannerClasses +=
      " border-amber-500/30 bg-amber-500/15 text-amber-300";
  } else if (normalized === "PRODUCTION") {
    bannerClasses +=
      " border-red-500/30 bg-red-500/15 text-red-300";
  } else {
    bannerClasses +=
      " border-slate-700 bg-slate-800/80 text-slate-300";
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <>
      <div className={bannerClasses} role="banner" aria-label={`Environment: ${label}`}>
        {label} environment
      </div>
      {/* Push content down on non-auth pages; auth pages center their card
          and the banner overlays without shifting the layout. */}
      {!isAuthRoute && <div className="h-8" aria-hidden="true" />}
    </>
  );
}
