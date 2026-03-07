import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlagGlobal,
  checkFeatureEnabled,
} from "../feature-flags";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  },
}));

describe("Feature Flag Actions", () => {
  const mockFlag = {
    id: "flag_123",
    key: "new_feature",
    name: "New Feature",
    description: "A cool new feature",
    enabled_globally: false,
    enabled_for_orgs: [] as string[],
    enabled_for_users: [] as string[],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFeatureFlags", () => {
    it("should return all feature flags", async () => {
      const mockSelect = vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [mockFlag], error: null })),
      }));
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });

      const result = await getFeatureFlags();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("new_feature");
      expect(result[0].enabledGlobally).toBe(false);
    });

    it("should handle database error", async () => {
      const mockSelect = vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "DB Error" } })
        ),
      }));
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });

      await expect(getFeatureFlags()).rejects.toThrow("Failed to fetch feature flags");
    });
  });

  describe("getFeatureFlagById", () => {
    it("should return flag by id", async () => {
      const mockEq = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockFlag, error: null })),
      }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });

      const result = await getFeatureFlagById("flag_123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("flag_123");
    });

    it("should return null for non-existent flag", async () => {
      const mockEq = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: { code: "PGRST116" } })),
      }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });

      const result = await getFeatureFlagById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createFeatureFlag", () => {
    it("should create flag and log action", async () => {
      const mockSelect = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockFlag, error: null })),
      }));
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => ({ select: mockSelect })),
      });

      const result = await createFeatureFlag({
        key: "new_feature",
        name: "New Feature",
        description: "A cool new feature",
      });

      expect(result.key).toBe("new_feature");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "feature_flag.create",
        targetType: "feature_flag",
        targetId: "flag_123",
        targetName: "New Feature",
        metadata: { key: "new_feature" },
      });
    });

    it("should create flag with global enabled", async () => {
      const enabledFlag = { ...mockFlag, enabled_globally: true };
      const mockSelect = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: enabledFlag, error: null })),
      }));
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => ({ select: mockSelect })),
      });

      const result = await createFeatureFlag({
        key: "enabled_feature",
        name: "Enabled Feature",
        enabledGlobally: true,
      });

      expect(result.enabledGlobally).toBe(true);
    });
  });

  describe("updateFeatureFlag", () => {
    it("should update flag and log action", async () => {
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      });

      await updateFeatureFlag("flag_123", {
        name: "Updated Name",
        enabledGlobally: true,
      });

      expect(logAdminAction).toHaveBeenCalledWith({
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: "flag_123",
        metadata: { name: "Updated Name", enabledGlobally: true },
      });
    });

    it("should update org and user lists", async () => {
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      });

      await updateFeatureFlag("flag_123", {
        enabledForOrgs: ["org_1", "org_2"],
        enabledForUsers: ["user_1"],
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith("feature_flags");
    });
  });

  describe("toggleFeatureFlagGlobal", () => {
    it("should toggle global status", async () => {
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      });

      await toggleFeatureFlagGlobal("flag_123", true);

      expect(mockSupabaseFrom).toHaveBeenCalledWith("feature_flags");
    });
  });

  describe("deleteFeatureFlag", () => {
    it("should delete flag and log action", async () => {
      const mockEq = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockFlag, error: null })),
      }));
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({ eq: mockEq })),
        delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      });

      await deleteFeatureFlag("flag_123");

      expect(logAdminAction).toHaveBeenCalledWith({
        action: "feature_flag.delete",
        targetType: "feature_flag",
        targetId: "flag_123",
        targetName: "New Feature",
      });
    });
  });

  describe("checkFeatureEnabled", () => {
    it("should check if feature is enabled for user", async () => {
      mockSupabaseRpc.mockResolvedValue({ data: true, error: null });

      const result = await checkFeatureEnabled("new_feature", "user_123", "org_123");

      expect(result).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith("is_feature_enabled", {
        flag_key: "new_feature",
        user_id: "user_123",
        org_id: "org_123",
      });
    });

    it("should return false on error", async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: "Error" } });

      const result = await checkFeatureEnabled("new_feature");

      expect(result).toBe(false);
    });
  });
});
