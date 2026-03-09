import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a proper mock chain that supports method chaining
// The key insight is that range() should return the chain (not a Promise)
// and only when the chain is awaited does it resolve to the data
const createMockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(function() {
      // insert doesn't return the chain, it executes
      return Promise.resolve({ error: null });
    }),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    // Make the chain thenable so it can be awaited
    then: vi.fn((resolve: (value: any) => void) => {
      return resolve({ data: [], error: null, count: 0 });
    }),
  };
  return chain;
};

let mockChain = createMockChain();

// Mock Supabase
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
  },
}));

const mockClerkClient = {
  users: {
    getUser: vi.fn(),
  },
};

let mockAuthUserId: string | null = "admin_123";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: mockAuthUserId,
    }),
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

// Import functions after mocking
import { logAdminAction, getAuditLogs, getAuditLogsForTarget } from "../logger";

describe("Audit Logger", () => {
  const mockAdmin = {
    id: "admin_123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId = "admin_123";
    mockClerkClient.users.getUser.mockResolvedValue(mockAdmin);
    // Reset the mock chain
    mockChain = createMockChain();
  });

  describe("logAdminAction", () => {
    it("should log action with all metadata", async () => {
      await logAdminAction({
        action: "user.update",
        targetType: "user",
        targetId: "user_456",
        targetName: "John Doe",
        metadata: { field: "email", oldValue: "old@test.com", newValue: "new@test.com" },
      });

      expect(mockChain.insert).toHaveBeenCalledWith({
        admin_id: "admin_123",
        admin_email: "admin@example.com",
        action: "user.update",
        target_type: "user",
        target_id: "user_456",
        target_name: "John Doe",
        metadata: { field: "email", oldValue: "old@test.com", newValue: "new@test.com" },
        ip_address: "127.0.0.1",
        user_agent: "Test-Agent",
      });
    });

    it("should handle optional fields", async () => {
      await logAdminAction({
        action: "system.config_update",
        targetType: "system",
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "system.config_update",
          target_type: "system",
          target_id: null,
          target_name: null,
          metadata: {},
        })
      );
    });

    it("should not throw on database error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // Override insert to throw an exception (which is what happens on real DB errors)
      mockChain.insert.mockRejectedValueOnce(new Error("DB Error"));

      await expect(
        logAdminAction({
          action: "user.update",
          targetType: "user",
        })
      ).resolves.not.toThrow();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should not throw if user not authenticated", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockAuthUserId = null;

      await expect(
        logAdminAction({
          action: "user.update",
          targetType: "user",
        })
      ).resolves.not.toThrow();

      expect(consoleError).toHaveBeenCalledWith(
        "Cannot log admin action: no authenticated user"
      );
      consoleError.mockRestore();
    });
  });

  describe("getAuditLogs", () => {
    const mockLog = {
      id: "log_1",
      admin_id: "admin_123",
      admin_email: "admin@example.com",
      action: "user.update",
      target_type: "user",
      target_id: "user_456",
      target_name: "John Doe",
      metadata: {},
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should return logs with default pagination", async () => {
      // Override the then method to return data
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({ data: [mockLog], error: null, count: 1 });
      });

      const result = await getAuditLogs();

      expect(result.logs).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it("should apply filters when provided", async () => {
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({ data: [], error: null, count: 0 });
      });

      await getAuditLogs({ 
        targetType: "user",
        targetId: "user_456",
        adminId: "admin_123",
        action: "user.delete"
      });

      // Verify eq was called for each filter
      expect(mockChain.eq).toHaveBeenCalledWith("target_type", "user");
      expect(mockChain.eq).toHaveBeenCalledWith("target_id", "user_456");
      expect(mockChain.eq).toHaveBeenCalledWith("admin_id", "admin_123");
      expect(mockChain.eq).toHaveBeenCalledWith("action", "user.delete");
    });

    it("should apply date range filters", async () => {
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({ data: [], error: null, count: 0 });
      });

      await getAuditLogs({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(mockChain.gte).toHaveBeenCalledWith("created_at", "2024-01-01");
      expect(mockChain.lte).toHaveBeenCalledWith("created_at", "2024-01-31");
    });

    it("should handle database error", async () => {
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({ data: null, error: { message: "DB Error" } });
      });

      await expect(getAuditLogs()).rejects.toThrow("Failed to fetch audit logs");
    });
  });

  describe("getAuditLogsForTarget", () => {
    it("should return logs for specific target", async () => {
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({
          data: [
            {
              id: "log_1",
              admin_id: "admin_123",
              admin_email: "admin@example.com",
              action: "user.update",
              target_type: "user",
              target_id: "user_456",
              target_name: null,
              metadata: {},
              created_at: "2024-01-01T00:00:00Z",
            },
          ],
          error: null,
          count: 1,
        });
      });

      const result = await getAuditLogsForTarget("user", "user_456");

      expect(result).toHaveLength(1);
      expect(result[0].targetType).toBe("user");
    });

    it("should respect limit parameter", async () => {
      mockChain.then = vi.fn((resolve: (value: any) => void) => {
        return resolve({ data: [], error: null, count: 0 });
      });

      await getAuditLogsForTarget("user", "user_456", 10);

      expect(mockChain.range).toHaveBeenCalledWith(0, 9);
    });
  });
});
