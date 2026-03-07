import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementActive,
  deleteAnnouncement,
} from "../announcements";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Create mock functions
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseSingle = vi.fn();

// Mock Supabase - use factory that returns the mock
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
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
      single: mockSupabaseSingle,
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
      expect(result[0].targetTiers).toEqual([]);
      expect(result[0].targetOrgs).toEqual([]);
    });

    it("should throw error when database fails", async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(getAnnouncements()).rejects.toThrow("Failed to fetch announcements");
    });

    it("should handle announcements with targeting", async () => {
      const mockData = [
        {
          id: "ann_1",
          title: "Pro Only",
          content: "For pro users",
          type: "info",
          target_tiers: ["pro", "enterprise"],
          target_orgs: ["org_1"],
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

      expect(result[0].targetTiers).toEqual(["pro", "enterprise"]);
      expect(result[0].targetOrgs).toEqual(["org_1"]);
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

    it("should filter out ended announcements", async () => {
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
            title: "Ended",
            content: "Content",
            type: "info",
            target_tiers: [],
            target_orgs: [],
            starts_at: "2024-01-01T00:00:00Z",
            ends_at: "2024-01-02T00:00:00Z", // Already ended
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

      // Should be filtered out because ends_at is in the past
      expect(result).toHaveLength(0);
    });
  });

  describe("createAnnouncement", () => {
    it("should create announcement with all fields", async () => {
      const mockData = {
        id: "ann_new",
        title: "New Announcement",
        content: "New content",
        type: "info",
        target_tiers: ["pro"],
        target_orgs: ["org_1"],
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

      const result = await createAnnouncement(
        {
          title: "New Announcement",
          content: "New content",
          type: "info",
          targetTiers: ["pro"],
          targetOrgs: ["org_1"],
          startsAt: "2024-03-15T00:00:00Z",
          endsAt: "2024-03-20T00:00:00Z",
        },
        "user_123",
        "admin@example.com"
      );

      expect(result.id).toBe("ann_new");
      expect(result.title).toBe("New Announcement");
      expect(result.type).toBe("info");
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

      await createAnnouncement(
        {
          title: "Test",
          content: "Content",
          type: "info",
        },
        "user_123",
        "admin@example.com"
      );

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          starts_at: expect.any(String),
          created_by: "user_123",
          created_by_email: "admin@example.com",
        })
      );
    });

    it("should create critical announcement", async () => {
      const mockData = {
        id: "ann_critical",
        title: "Critical Alert",
        content: "Important!",
        type: "critical",
        target_tiers: [],
        target_orgs: [],
        starts_at: "2024-03-15T00:00:00Z",
        ends_at: null,
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

      const result = await createAnnouncement(
        {
          title: "Critical Alert",
          content: "Important!",
          type: "critical",
        },
        "user_123",
        "admin@example.com"
      );

      expect(result.type).toBe("critical");
    });

    it("should create warning announcement", async () => {
      const mockData = {
        id: "ann_warning",
        title: "Warning",
        content: "Be careful",
        type: "warning",
        target_tiers: [],
        target_orgs: [],
        starts_at: "2024-03-15T00:00:00Z",
        ends_at: null,
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

      const result = await createAnnouncement(
        {
          title: "Warning",
          content: "Be careful",
          type: "warning",
        },
        "user_123",
        "admin@example.com"
      );

      expect(result.type).toBe("warning");
    });

    it("should create maintenance announcement", async () => {
      const mockData = {
        id: "ann_maintenance",
        title: "Maintenance",
        content: "System down",
        type: "maintenance",
        target_tiers: [],
        target_orgs: [],
        starts_at: "2024-03-15T00:00:00Z",
        ends_at: null,
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

      const result = await createAnnouncement(
        {
          title: "Maintenance",
          content: "System down",
          type: "maintenance",
        },
        "user_123",
        "admin@example.com"
      );

      expect(result.type).toBe("maintenance");
    });
  });

  describe("updateAnnouncement", () => {
    it("should update announcement", async () => {
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

    it("should activate announcement", async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await toggleAnnouncementActive("ann_123", true);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });
  });

  describe("deleteAnnouncement", () => {
    it("should delete announcement", async () => {
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

      expect(mockSupabaseDelete).toHaveBeenCalled();
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
