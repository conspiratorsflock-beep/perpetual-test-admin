/**
 * Admin Banner - Shared code for the main Perpetual Test app
 * 
 * This file contains types and utilities for displaying admin announcements
 * in the main software testing application.
 * 
 * Copy these types and adapt the component to your app's styling system.
 */

export type AnnouncementType = "info" | "warning" | "critical" | "maintenance";

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetTiers: string[];
  targetOrgs: string[];
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerProps {
  announcement: AdminAnnouncement;
  onDismiss?: (id: string) => void;
}

/**
 * Style configurations for each announcement type.
 * Adapt these to match your app's design system.
 */
export const bannerStyles: Record<AnnouncementType, {
  container: string;
  icon: string;
  title: string;
  content: string;
  closeButton: string;
}> = {
  info: {
    container: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    icon: "text-blue-400",
    title: "text-blue-300 font-semibold",
    content: "text-blue-400",
    closeButton: "text-blue-400 hover:text-blue-300",
  },
  warning: {
    container: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    icon: "text-amber-400",
    title: "text-amber-300 font-semibold",
    content: "text-amber-400",
    closeButton: "text-amber-400 hover:text-amber-300",
  },
  critical: {
    container: "bg-red-500/10 border-red-500/20 text-red-400",
    icon: "text-red-400",
    title: "text-red-300 font-semibold",
    content: "text-red-400",
    closeButton: "text-red-400 hover:text-red-300",
  },
  maintenance: {
    container: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    icon: "text-purple-400",
    title: "text-purple-300 font-semibold",
    content: "text-purple-400",
    closeButton: "text-purple-400 hover:text-purple-300",
  },
};

/**
 * Icons for each announcement type.
 * You can replace these with your preferred icon library.
 */
export const bannerIcons: Record<AnnouncementType, string> = {
  info: "ℹ️",
  warning: "⚠️",
  critical: "🚨",
  maintenance: "🔧",
};

/**
 * Check if an announcement should be shown to the current user.
 * Call this before displaying a banner.
 */
export function shouldShowAnnouncement(
  announcement: AdminAnnouncement,
  userTier?: string,
  orgId?: string
): boolean {
  // Check if announcement is active
  if (!announcement.isActive) return false;

  // Check date range
  const now = new Date();
  const startsAt = new Date(announcement.startsAt);
  if (startsAt > now) return false;

  if (announcement.endsAt) {
    const endsAt = new Date(announcement.endsAt);
    if (endsAt < now) return false;
  }

  // Check tier targeting (empty = all tiers)
  if (announcement.targetTiers.length > 0 && userTier) {
    if (!announcement.targetTiers.includes(userTier)) return false;
  }

  // Check org targeting (empty = all orgs)
  if (announcement.targetOrgs.length > 0 && orgId) {
    if (!announcement.targetOrgs.includes(orgId)) return false;
  }

  return true;
}

/**
 * Get dismissed announcement IDs from localStorage.
 * Call this on component mount.
 */
export function getDismissedAnnouncements(): string[] {
  if (typeof window === "undefined") return [];
  
  try {
    const dismissed = localStorage.getItem("dismissedAnnouncements");
    return dismissed ? JSON.parse(dismissed) : [];
  } catch {
    return [];
  }
}

/**
 * Save dismissed announcement ID to localStorage.
 * Call this when user dismisses a banner.
 */
export function dismissAnnouncement(id: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const dismissed = getDismissedAnnouncements();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem("dismissedAnnouncements", JSON.stringify(dismissed));
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear all dismissed announcements.
 * Call this if you want to reset dismissed state.
 */
export function clearDismissedAnnouncements(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem("dismissedAnnouncements");
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Filter announcements to only show relevant, non-dismissed ones.
 * Critical announcements cannot be dismissed and are always shown.
 */
export function filterAnnouncements(
  announcements: AdminAnnouncement[],
  dismissedIds: string[],
  userTier?: string,
  orgId?: string
): AdminAnnouncement[] {
  return announcements
    .filter((a) => shouldShowAnnouncement(a, userTier, orgId))
    .filter((a) => a.type === "critical" || !dismissedIds.includes(a.id));
}

/**
 * Check if an announcement can be dismissed.
 * Critical announcements cannot be dismissed.
 */
export function canDismissAnnouncement(type: AnnouncementType): boolean {
  return type !== "critical";
}

/**
 * Clear all admin banner dismissals from localStorage.
 * This will make all announcements visible again to the user.
 * Call this from an admin panel to reset dismissals for all users.
 * 
 * Emits a custom event 'announcements:reset' that components can listen for
 * to update UI without requiring a page refresh.
 */
export function clearAllDismissals(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Clear the main dismissed announcements key
    localStorage.removeItem("dismissedAnnouncements");
    
    // Also clear any legacy keys that might exist
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("admin-banner-dismissed-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    
    // Broadcast the reset event so components can update immediately
    window.dispatchEvent(new CustomEvent("announcements:reset"));
  } catch {
    // Ignore localStorage errors
  }
}
