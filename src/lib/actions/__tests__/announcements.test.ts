import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementActive,
  deleteAnnouncement,
} from "../announcements";
import { logAdminAction } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseOrder = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

describe("Announcements Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
    });
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      single: vi.fn(),
    });
  });

  describe("getAnnouncements", () => {
    it("should return all announcements ordered by created_at", async () => {
      const mockData = [
        {
          id: "ann_1",
          title: "Test Announcement",
          content: "Test content",
          type: "info",
          target_tiers: [],
          target_orgs: [],
          starts_at: "2024-03-01T00:00:00Z",
          ends_at: null,
          is_active: true,
          created_by: "user_123",
          created_by_email: "admin@example.com",
          created_at: "2024-03-01T00:00:00Z",
          updated_at: "2024-03-01T00:00:00Z",
        },
      ];

      mockSupabaseOrder.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getAnnouncements();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Announcement");
      expect(result[0].type).toBe("info");
    });

    it("should throw error when database fails", async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(getAnnouncements()).rejects.toThrow("Failed to fetch announcements");
    });
  });

  describe("getActiveAnnouncements", () => {
    it("should return only active, non-expired announcements", async () => {
      mockSupabaseEq.mockReturnValue({
        lte: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: mockSupabaseOrder,
          }),
        }),
      });

      mockSupabaseOrder.mockResolvedValue({
        data: [
          {
            id: "ann_1",
            title: "Active",
            content: "Content",
            type: "warning",
            target_tiers: [],
            target_orgs: [],
            starts_at: "2024-01-01T00:00:00Z",
            ends_at: null,
            is_active: true,
            created_by: "user_123",
            created_by_email: "admin@example.com",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await getActiveAnnouncements();

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe("createAnnouncement", () => {
    it("should create announcement and log action", async () => {
      const mockData = {
        id: "ann_new",
        title: "New Announcement",
        content: "New content",
        type: "info",
        target_tiers: ["pro"],
        target_orgs: [],
        starts_at: "2024-03-15T00:00:00Z",
        ends_at: "2024-03-20T00:00:00Z",
        is_active: true,
        created_by: "user_123",
        created_by_email: "admin@example.com",
        created_at: "2024-03-01T00:00:00Z",
        updated_at: "2024-03-01T00:00:00Z",
      };

      mockSupabaseInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await createAnnouncement({
        title: "New Announcement",
        content: "New content",
        type: "info",
        targetTiers: ["pro"],
        startsAt: "2024-03-15T00:00:00Z",
        endsAt: "2024-03-20T00:00:00Z",
      });

      expect(result.id).toBe("ann_new");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "announcement.create",
        targetType: "announcement",
        targetId: "ann_new",
        targetName: "New Announcement",
        metadata: { type: "info" },
      });
    });

    it("should use current time as default start date", async () => {
      mockSupabaseInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "ann_1", title: "Test" },
            error: null,
          }),
        }),
      });

      await createAnnouncement({
        title: "Test",
        content: "Content",
        type: "info",
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          starts_at: expect.any(String),
        })
      );
    });
  });

  describe("updateAnnouncement", () => {
    it("should update announcement and log action", async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await updateAnnouncement("ann_123", {
        title: "Updated Title",
        isActive: false,
      });

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
          is_active: false,
        })
      );
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "announcement.update",
        targetType: "announcement",
        targetId: "ann_123",
        metadata: { title: "Updated Title", isActive: false },
      });
    });

    it("should throw error when update fails", async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
      });

      await expect(
        updateAnnouncement("ann_123", { title: "Test" })
      ).rejects.toThrow("Failed to update announcement");
    });
  });

  describe("toggleAnnouncementActive", () => {
    it("should toggle active status", async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await toggleAnnouncementActive("ann_123", false);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });
  });

  describe("deleteAnnouncement", () => {
    it("should delete announcement and log action", async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { title: "To Delete" },
            error: null,
          }),
        }),
      });

      mockSupabaseDelete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await deleteAnnouncement("ann_123");

      expect(logAdminAction).toHaveBeenCalledWith({
        action: "announcement.delete",
        targetType: "announcement",
        targetId: "ann_123",
        targetName: "To Delete",
      });
    });

    it("should throw error when delete fails", async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      mockSupabaseDelete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      await expect(deleteAnnouncement("ann_123")).rejects.toThrow(
        "Failed to delete announcement"
      );
    });
  });
});
