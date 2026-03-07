"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Info, AlertTriangle, AlertCircle, Wrench } from "lucide-react";
import type { AdminAnnouncement, AnnouncementType } from "./admin-banner";
import {
  bannerStyles,
  getDismissedAnnouncements,
  dismissAnnouncement,
  filterAnnouncements,
  canDismissAnnouncement,
} from "./admin-banner";

// Icon components for each type
const typeIcons: Record<AnnouncementType, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
  maintenance: Wrench,
};

interface AdminBannerProps {
  /** Single announcement to display */
  announcement?: AdminAnnouncement;
  /** Multiple announcements - will show the most recent */
  announcements?: AdminAnnouncement[];
  /** User's tier (e.g., "free", "pro", "enterprise") */
  userTier?: string;
  /** Current organization ID */
  orgId?: string;
  /** Called when banner is dismissed */
  onDismiss?: (id: string) => void;
  /** Custom className for the container */
  className?: string;
}

/**
 * AdminBanner Component
 * 
 * Displays admin announcements from the Perpetual Test Admin Console.
 * 
 * Usage:
 * ```tsx
 * // Single announcement
 * <AdminBanner announcement={announcement} />
 * 
 * // Multiple announcements with targeting
 * <AdminBanner 
 *   announcements={announcements}
 *   userTier="pro"
 *   orgId="org_123"
 * />
 * ```
 */
export function AdminBanner({
  announcement,
  announcements,
  userTier,
  orgId,
  onDismiss,
  className = "",
}: AdminBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load dismissed announcements on mount
  useEffect(() => {
    setDismissedIds(getDismissedAnnouncements());
    setIsMounted(true);
  }, []);

  // Listen for reset events from clearAllDismissals()
  useEffect(() => {
    const handleReset = () => {
      setDismissedIds([]);
    };
    
    window.addEventListener("announcements:reset", handleReset);
    return () => window.removeEventListener("announcements:reset", handleReset);
  }, []);

  // Get the announcement to display
  const displayAnnouncement = announcement
    ? announcement
    : announcements
    ? filterAnnouncements(announcements, dismissedIds, userTier, orgId)[0]
    : null;

  // Don't render during SSR or if no announcement
  if (!isMounted || !displayAnnouncement) {
    return null;
  }

  const handleDismiss = useCallback(() => {
    dismissAnnouncement(displayAnnouncement.id);
    setDismissedIds((prev) => [...prev, displayAnnouncement.id]);
    onDismiss?.(displayAnnouncement.id);
  }, [displayAnnouncement.id, onDismiss]);

  const TypeIcon = typeIcons[displayAnnouncement.type];
  const styles = bannerStyles[displayAnnouncement.type];
  const isDismissible = canDismissAnnouncement(displayAnnouncement.type);

  return (
    <div
      className={`
        relative w-full px-4 py-3 border rounded-lg
        ${styles.container}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <TypeIcon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {displayAnnouncement.title && (
            <h3 className={`text-sm ${styles.title}`}>
              {displayAnnouncement.title}
            </h3>
          )}
          <div
            className={`text-sm mt-1 ${styles.content}`}
            dangerouslySetInnerHTML={{
              __html: displayAnnouncement.content,
            }}
          />
        </div>

        {/* Dismiss button - only for non-critical announcements */}
        {isDismissible && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 -mr-1 -mt-1 p-1 rounded
              transition-colors
              ${styles.closeButton}
            `}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AdminBannerStack Component
 * 
 * Displays multiple announcements stacked vertically.
 * Useful for showing all relevant announcements at once.
 */
interface AdminBannerStackProps {
  announcements: AdminAnnouncement[];
  userTier?: string;
  orgId?: string;
  maxDisplay?: number;
  className?: string;
}

export function AdminBannerStack({
  announcements,
  userTier,
  orgId,
  maxDisplay = 3,
  className = "",
}: AdminBannerStackProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setDismissedIds(getDismissedAnnouncements());
    setIsMounted(true);
  }, []);

  // Listen for reset events from clearAllDismissals()
  useEffect(() => {
    const handleReset = () => {
      setDismissedIds([]);
    };
    
    window.addEventListener("announcements:reset", handleReset);
    return () => window.removeEventListener("announcements:reset", handleReset);
  }, []);

  if (!isMounted) return null;

  const visibleAnnouncements = filterAnnouncements(
    announcements,
    dismissedIds,
    userTier,
    orgId
  ).slice(0, maxDisplay);

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {visibleAnnouncements.map((announcement) => (
        <AdminBanner
          key={announcement.id}
          announcement={announcement}
          onDismiss={(id) =>
            setDismissedIds((prev) => [...prev, id])
          }
        />
      ))}
    </div>
  );
}

export default AdminBanner;
