import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shouldShowAnnouncement,
  getDismissedAnnouncements,
  dismissAnnouncement,
  clearDismissedAnnouncements,
  clearAllDismissals,
  filterAnnouncements,
  canDismissAnnouncement,
  bannerStyles,
  bannerIcons,
} from "../admin-banner";
import type { AdminAnnouncement } from "../admin-banner";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Admin Banner", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shouldShowAnnouncement", () => {
    const baseAnnouncement: AdminAnnouncement = {
      id: "ann_1",
      title: "Test Announcement",
      content: "Test content",
      type: "info",
      targetTiers: [],
      targetOrgs: [],
      startsAt: new Date(Date.now() - 1000).toISOString(), // Started 1 second ago
      endsAt: null,
      isActive: true,
      createdBy: "user_1",
      createdByEmail: "admin@test.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should show active announcement with no restrictions", () => {
      expect(shouldShowAnnouncement(baseAnnouncement)).toBe(true);
    });

    it("should not show inactive announcement", () => {
      const announcement = { ...baseAnnouncement, isActive: false };
      expect(shouldShowAnnouncement(announcement)).toBe(false);
    });

    it("should not show announcement that hasn't started yet", () => {
      const announcement = {
        ...baseAnnouncement,
        startsAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };
      expect(shouldShowAnnouncement(announcement)).toBe(false);
    });

    it("should not show announcement that has ended", () => {
      const announcement = {
        ...baseAnnouncement,
        endsAt: new Date(Date.now() - 1000).toISOString(), // Ended 1 second ago
      };
      expect(shouldShowAnnouncement(announcement)).toBe(false);
    });

    it("should show announcement with matching tier", () => {
      const announcement = {
        ...baseAnnouncement,
        targetTiers: ["pro", "enterprise"],
      };
      expect(shouldShowAnnouncement(announcement, "pro")).toBe(true);
      expect(shouldShowAnnouncement(announcement, "enterprise")).toBe(true);
    });

    it("should not show announcement with non-matching tier", () => {
      const announcement = {
        ...baseAnnouncement,
        targetTiers: ["pro", "enterprise"],
      };
      expect(shouldShowAnnouncement(announcement, "free")).toBe(false);
    });

    it("should show announcement with empty tier targeting to all users", () => {
      const announcement = {
        ...baseAnnouncement,
        targetTiers: [],
      };
      expect(shouldShowAnnouncement(announcement, "free")).toBe(true);
      expect(shouldShowAnnouncement(announcement, "pro")).toBe(true);
      expect(shouldShowAnnouncement(announcement, undefined)).toBe(true);
    });

    it("should show announcement with matching org", () => {
      const announcement = {
        ...baseAnnouncement,
        targetOrgs: ["org_1", "org_2"],
      };
      expect(shouldShowAnnouncement(announcement, undefined, "org_1")).toBe(true);
      expect(shouldShowAnnouncement(announcement, undefined, "org_2")).toBe(true);
    });

    it("should not show announcement with non-matching org", () => {
      const announcement = {
        ...baseAnnouncement,
        targetOrgs: ["org_1", "org_2"],
      };
      expect(shouldShowAnnouncement(announcement, undefined, "org_3")).toBe(false);
    });

    it("should show announcement with empty org targeting to all orgs", () => {
      const announcement = {
        ...baseAnnouncement,
        targetOrgs: [],
      };
      expect(shouldShowAnnouncement(announcement, undefined, "org_1")).toBe(true);
      expect(shouldShowAnnouncement(announcement, undefined, undefined)).toBe(true);
    });

    it("should handle both tier and org targeting together", () => {
      const announcement = {
        ...baseAnnouncement,
        targetTiers: ["pro"],
        targetOrgs: ["org_1"],
      };
      // Must match both
      expect(shouldShowAnnouncement(announcement, "pro", "org_1")).toBe(true);
      expect(shouldShowAnnouncement(announcement, "free", "org_1")).toBe(false);
      expect(shouldShowAnnouncement(announcement, "pro", "org_2")).toBe(false);
    });
  });

  describe("canDismissAnnouncement", () => {
    it("should allow dismissing info announcements", () => {
      expect(canDismissAnnouncement("info")).toBe(true);
    });

    it("should allow dismissing warning announcements", () => {
      expect(canDismissAnnouncement("warning")).toBe(true);
    });

    it("should allow dismissing maintenance announcements", () => {
      expect(canDismissAnnouncement("maintenance")).toBe(true);
    });

    it("should NOT allow dismissing critical announcements", () => {
      expect(canDismissAnnouncement("critical")).toBe(false);
    });
  });

  describe("getDismissedAnnouncements", () => {
    it("should return empty array when nothing is dismissed", () => {
      expect(getDismissedAnnouncements()).toEqual([]);
    });

    it("should return dismissed announcement IDs from localStorage", () => {
      localStorageMock.setItem("dismissedAnnouncements", JSON.stringify(["ann_1", "ann_2"]));
      expect(getDismissedAnnouncements()).toEqual(["ann_1", "ann_2"]);
    });

    it("should return empty array for invalid JSON", () => {
      localStorageMock.setItem("dismissedAnnouncements", "invalid json");
      expect(getDismissedAnnouncements()).toEqual([]);
    });
  });

  describe("dismissAnnouncement", () => {
    it("should add announcement ID to dismissed list", () => {
      dismissAnnouncement("ann_1");
      expect(getDismissedAnnouncements()).toContain("ann_1");
    });

    it("should not add duplicate IDs", () => {
      dismissAnnouncement("ann_1");
      dismissAnnouncement("ann_1");
      const dismissed = getDismissedAnnouncements();
      expect(dismissed).toEqual(["ann_1"]);
    });

    it("should add multiple different announcements", () => {
      dismissAnnouncement("ann_1");
      dismissAnnouncement("ann_2");
      const dismissed = getDismissedAnnouncements();
      expect(dismissed).toContain("ann_1");
      expect(dismissed).toContain("ann_2");
      expect(dismissed).toHaveLength(2);
    });
  });

  describe("clearDismissedAnnouncements", () => {
    it("should clear all dismissed announcements", () => {
      dismissAnnouncement("ann_1");
      dismissAnnouncement("ann_2");
      clearDismissedAnnouncements();
      expect(getDismissedAnnouncements()).toEqual([]);
    });

    it("should handle clearing when already empty", () => {
      clearDismissedAnnouncements();
      expect(getDismissedAnnouncements()).toEqual([]);
    });
  });

  describe("clearAllDismissals", () => {
    it("should clear dismissed announcements and broadcast event", () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
      
      dismissAnnouncement("ann_1");
      clearAllDismissals();
      
      expect(getDismissedAnnouncements()).toEqual([]);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "announcements:reset" })
      );
    });

    it("should clear legacy localStorage keys", () => {
      // Set up legacy keys directly in the mock store
      (localStorageMock as unknown as Record<string, string>)["admin-banner-dismissed-ann_1"] = "true";
      (localStorageMock as unknown as Record<string, string>)["admin-banner-dismissed-ann_2"] = "true";
      
      clearAllDismissals();
      
      expect(localStorageMock.getItem("admin-banner-dismissed-ann_1")).toBeNull();
      expect(localStorageMock.getItem("admin-banner-dismissed-ann_2")).toBeNull();
    });
  });

  describe("filterAnnouncements", () => {
    const createAnnouncement = (overrides: Partial<AdminAnnouncement> = {}): AdminAnnouncement => ({
      id: "ann_1",
      title: "Test",
      content: "Test content",
      type: "info",
      targetTiers: [],
      targetOrgs: [],
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: null,
      isActive: true,
      createdBy: "user_1",
      createdByEmail: "admin@test.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });

    it("should filter out dismissed announcements", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1" }),
        createAnnouncement({ id: "ann_2" }),
        createAnnouncement({ id: "ann_3" }),
      ];
      
      const filtered = filterAnnouncements(announcements, ["ann_2"]);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.id)).toEqual(["ann_1", "ann_3"]);
    });

    it("should NOT filter out critical announcements even if dismissed", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1", type: "info" }),
        createAnnouncement({ id: "ann_2", type: "critical" }),
        createAnnouncement({ id: "ann_3", type: "warning" }),
      ];
      
      const filtered = filterAnnouncements(announcements, ["ann_1", "ann_2", "ann_3"]);
      // Only critical should remain
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("ann_2");
      expect(filtered[0].type).toBe("critical");
    });

    it("should filter by tier targeting", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1", targetTiers: ["pro"] }),
        createAnnouncement({ id: "ann_2", targetTiers: ["free"] }),
        createAnnouncement({ id: "ann_3", targetTiers: [] }),
      ];
      
      const filtered = filterAnnouncements(announcements, [], "pro");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.id)).toEqual(["ann_1", "ann_3"]);
    });

    it("should filter by org targeting", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1", targetOrgs: ["org_1"] }),
        createAnnouncement({ id: "ann_2", targetOrgs: ["org_2"] }),
        createAnnouncement({ id: "ann_3", targetOrgs: [] }),
      ];
      
      const filtered = filterAnnouncements(announcements, [], undefined, "org_1");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.id)).toEqual(["ann_1", "ann_3"]);
    });

    it("should filter by date (not started)", () => {
      const announcements = [
        createAnnouncement({ 
          id: "ann_1", 
          startsAt: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        }),
        createAnnouncement({ id: "ann_2" }),
      ];
      
      const filtered = filterAnnouncements(announcements, []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("ann_2");
    });

    it("should filter by date (ended)", () => {
      const announcements = [
        createAnnouncement({ 
          id: "ann_1", 
          endsAt: new Date(Date.now() - 1000).toISOString() // Yesterday
        }),
        createAnnouncement({ id: "ann_2" }),
      ];
      
      const filtered = filterAnnouncements(announcements, []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("ann_2");
    });

    it("should filter inactive announcements", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1", isActive: false }),
        createAnnouncement({ id: "ann_2", isActive: true }),
      ];
      
      const filtered = filterAnnouncements(announcements, []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("ann_2");
    });

    it("should handle combined filters", () => {
      const announcements = [
        createAnnouncement({ id: "ann_1", type: "info", targetTiers: ["pro"] }),
        createAnnouncement({ id: "ann_2", type: "critical", targetTiers: ["pro"] }),
        createAnnouncement({ id: "ann_3", type: "warning", targetTiers: ["pro"] }),
      ];
      
      // User is "pro" and has dismissed ann_1 and ann_2
      const filtered = filterAnnouncements(announcements, ["ann_1", "ann_2"], "pro");
      
      // ann_1: dismissed (filtered out)
      // ann_2: dismissed but critical (shown)
      // ann_3: not dismissed, matching tier (shown)
      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.id)).toEqual(["ann_2", "ann_3"]);
    });
  });

  describe("bannerStyles", () => {
    it("should have styles for all announcement types", () => {
      expect(bannerStyles.info).toBeDefined();
      expect(bannerStyles.warning).toBeDefined();
      expect(bannerStyles.critical).toBeDefined();
      expect(bannerStyles.maintenance).toBeDefined();
    });

    it("should have required style properties", () => {
      const requiredProps = ["container", "icon", "title", "content", "closeButton"];
      requiredProps.forEach((prop) => {
        expect(bannerStyles.info).toHaveProperty(prop);
        expect(bannerStyles.warning).toHaveProperty(prop);
        expect(bannerStyles.critical).toHaveProperty(prop);
        expect(bannerStyles.maintenance).toHaveProperty(prop);
      });
    });
  });

  describe("bannerIcons", () => {
    it("should have icons for all announcement types", () => {
      expect(bannerIcons.info).toBeDefined();
      expect(bannerIcons.warning).toBeDefined();
      expect(bannerIcons.critical).toBeDefined();
      expect(bannerIcons.maintenance).toBeDefined();
    });
  });
});
