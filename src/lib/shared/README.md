# Admin Banner - Integration Guide

This package provides components and utilities for displaying admin announcements from the Lathe Studio Admin Console in your main application.

## Files to Copy

Copy these files to your main Lathe Studio app:

```
src/lib/shared/
├── admin-banner.ts       # Types, styles, and utility functions
├── AdminBanner.tsx       # React components
├── get-announcements.ts  # Server action to fetch announcements
└── README.md            # This file
```

## Installation

1. **Copy the files** to your main app's `src/lib/admin-banner/` directory (or similar).

2. **Update imports** in `get-announcements.ts` to use your app's Supabase client.

3. **Install peer dependencies** if not already installed:
   ```bash
   npm install lucide-react
   ```

## Quick Start

### 1. Fetch Announcements (Server Component)

```tsx
// app/layout.tsx or app/page.tsx
import { getActiveAnnouncements } from "@/lib/admin-banner/get-announcements";
import { AdminBanner } from "@/lib/admin-banner/AdminBanner";

export default async function Layout({ children }) {
  const announcements = await getActiveAnnouncements();

  return (
    <div>
      {/* Show the most recent relevant announcement */}
      <AdminBanner
        announcements={announcements}
        orgId="org_xxx"       // Optional: current organization ID
      />
      {children}
    </div>
  );
}
```

### 2. Client-Side Usage

```tsx
"use client";

import { useEffect, useState } from "react";
import { AdminBanner, AdminBannerStack } from "@/lib/admin-banner/AdminBanner";
import { getActiveAnnouncements } from "@/lib/admin-banner/get-announcements";
import type { AdminAnnouncement } from "@/lib/admin-banner/admin-banner";

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements);
  }, []);

  return (
    <AdminBannerStack
      announcements={announcements}
      maxDisplay={2}
    />
  );
}
```

### 3. With Custom Styling

```tsx
<AdminBanner
  announcement={announcement}
  className="my-custom-class"
  onDismiss={(id) => console.log("Dismissed:", id)}
/>
```

## Components

### `AdminBanner`

Displays a single announcement banner.

**Props:**
- `announcement?: AdminAnnouncement` - Single announcement to display
- `announcements?: AdminAnnouncement[]` - Multiple announcements (shows most recent)
- `orgId?: string` - Organization ID for targeting
- `onDismiss?: (id: string) => void` - Called when user dismisses
- `className?: string` - Additional CSS classes

### `AdminBannerStack`

Displays multiple announcements stacked vertically.

**Props:**
- `announcements: AdminAnnouncement[]` - All announcements
- `orgId?: string` - Organization ID
- `maxDisplay?: number` - Maximum to show (default: 3)
- `className?: string` - Additional CSS classes

## Targeting

Announcements can be targeted by:

1. **Organization**: Show only to specific orgs
2. **Schedule**: Start and end dates

### Server-Side Filtering

```tsx
const announcements = await getAnnouncementsForUser("org_123");
```

### Client-Side Filtering

```tsx
<AdminBanner
  announcements={allAnnouncements}
  orgId={currentOrg?.id}
/>
```

## Styling

The components use Tailwind CSS classes by default. Adapt the styles in `admin-banner.ts` to match your design system:

```typescript
export const bannerStyles = {
  info: {
    container: "bg-blue-500/10 border-blue-500/20",
    // ... customize for your app
  },
  // ...
};
```

## Dismissal Persistence

Dismissed announcements are stored in `localStorage` and won't reappear until:
- User clears browser data
- You call `clearDismissedAnnouncements()`

## Types

```typescript
interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "critical" | "maintenance";
  targetOrgs: string[];
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  // ...
}
```

## Security Notes

- The `get-announcements.ts` uses the **service role key** - keep it server-side only
- Announcement content is rendered as HTML - sanitize if allowing rich text
- Org targeting is for UX only, not security (enforce in API)

## Troubleshooting

### Banners not showing
1. Check admin console for active announcements
2. Verify `starts_at` and `ends_at` dates
3. Check org targeting filters
4. Check if user dismissed the banner (clear localStorage)

### Styling issues
- Ensure Tailwind CSS is configured
- Check for CSS conflicts with your app's styles
- Override classes via `className` prop

### Database errors
- Verify Supabase URL and service key
- Check `admin_announcements` table exists
- Check RLS policies allow service role access
