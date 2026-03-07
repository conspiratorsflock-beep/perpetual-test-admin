/**
 * EXAMPLE: How to use AdminBanner in your main Perpetual Test app
 * 
 * Copy and adapt this example to your app's structure.
 */

// ============================================================
// EXAMPLE 1: Server Component (App Router)
// ============================================================

// app/layout.tsx
async function LayoutExample() {
  // Import from your copied location
  const { getActiveAnnouncements } = await import("./get-announcements");
  const { AdminBanner } = await import("./AdminBanner");

  const announcements = await getActiveAnnouncements();

  return (
    <html>
      <body>
        {/* Show banner at the top of the page */}
        <AdminBanner announcements={announcements} />
        
        <main>{/* Your app content */}</main>
      </body>
    </html>
  );
}

// ============================================================
// EXAMPLE 2: With User Context
// ============================================================

// components/AnnouncementBar.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useOrganization } from "@clerk/nextjs";
import { AdminBanner } from "@/lib/admin-banner/AdminBanner";
import { getActiveAnnouncements } from "@/lib/admin-banner/get-announcements";
import { useEffect, useState } from "react";
import type { AdminAnnouncement } from "@/lib/admin-banner/admin-banner";

export function AnnouncementBar() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements);
  }, []);

  // Get user's tier from metadata or subscription
  const userTier = user?.publicMetadata?.subscriptionTier as string | undefined;
  const orgId = organization?.id;

  return (
    <AdminBanner
      announcements={announcements}
      userTier={userTier}
      orgId={orgId}
    />
  );
}

// ============================================================
// EXAMPLE 3: Multiple Banners
// ============================================================

import { AdminBannerStack } from "@/lib/admin-banner/AdminBanner";

function MultipleAnnouncements() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements);
  }, []);

  return (
    <div className="space-y-2">
      <AdminBannerStack
        announcements={announcements}
        maxDisplay={3}
        userTier="pro"
      />
    </div>
  );
}

// ============================================================
// EXAMPLE 4: Custom Styling
// ============================================================

function CustomStyledBanner() {
  return (
    <AdminBanner
      announcements={announcements}
      className="rounded-none border-x-0 border-t-0"
      onDismiss={(id) => {
        // Optional: Track dismissal in analytics
        analytics.track("Announcement Dismissed", { id });
      }}
    />
  );
}

// ============================================================
// EXAMPLE 5: With Loading State
// ============================================================

import { Skeleton } from "@/components/ui/skeleton";

function BannerWithLoading() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveAnnouncements()
      .then(setAnnouncements)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return <AdminBanner announcements={announcements} />;
}

// ============================================================
// EXAMPLE 6: Conditional Display
// ============================================================

import { usePathname } from "next/navigation";

function ConditionalBanner() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements);
  }, []);

  // Don't show on certain pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  // Only show critical announcements on dashboard
  const criticalOnly = pathname === "/dashboard"
    ? announcements.filter((a) => a.type === "critical")
    : announcements;

  return <AdminBanner announcements={criticalOnly} />;
}

// ============================================================
// EXAMPLE 7: Full Integration in Layout
// ============================================================

// app/(dashboard)/layout.tsx
import { getActiveAnnouncements } from "@/lib/admin-banner/get-announcements";
import { AdminBannerStack } from "@/lib/admin-banner/AdminBanner";
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const announcements = await getActiveAnnouncements();

  // Get user's org from your database
  const userOrg = await getUserOrganization(user?.id);
  const userTier = user?.publicMetadata?.subscriptionTier as string | undefined;

  return (
    <div className="min-h-screen">
      {/* Top banner area */}
      <div className="container mx-auto px-4 pt-4">
        <AdminBannerStack
          announcements={announcements}
          userTier={userTier}
          orgId={userOrg?.id}
          maxDisplay={2}
        />
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

// Helper function (implement based on your DB schema)
async function getUserOrganization(userId: string | undefined) {
  if (!userId) return null;
  // Query your database for user's org
  // return db.query.organizations.findFirst(...)
  return null;
}

// ============================================================
// EXAMPLE 8: Refresh Announcements
// ============================================================

"use client";

import { useCallback } from "react";

function RefreshableBanner() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  const refresh = useCallback(async () => {
    // Clear dismissed announcements to show all again
    const { clearDismissedAnnouncements } = await import(
      "@/lib/admin-banner/admin-banner"
    );
    clearDismissedAnnouncements();
    
    // Fetch fresh data
    const fresh = await getActiveAnnouncements();
    setAnnouncements(fresh);
  }, []);

  return (
    <div>
      <button onClick={refresh}>Refresh Announcements</button>
      <AdminBanner announcements={announcements} />
    </div>
  );
}
