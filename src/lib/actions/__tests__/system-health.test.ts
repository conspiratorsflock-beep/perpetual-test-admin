import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runHealthChecks,
  getHealthCheckHistory,
  getLatestHealthStatus,
} from "../system-health";
import { logAdminAction } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Stripe
const mockStripeCustomers = {
  list: vi.fn(),
};

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: mockStripeCustomers,
  },
}));

// Mock Clerk
const mockClerkClient = {
  users: {
    getUserList: vi.fn(),
  },
};

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseLimit = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  },
}));

describe("System Health Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));

    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
    mockSupabaseSelect.mockReturnValue({
      order: mockSupabaseOrder,
    });
    mockSupabaseOrder.mockReturnValue({
      limit: mockSupabaseLimit,
    });
    mockSupabaseLimit.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("runHealthChecks", () => {
    it("should check all services and return results", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 });
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.name)).toContain("Supabase Database");
      expect(results.map((r) => r.name)).toContain("Clerk Auth");
      expect(results.map((r) => r.name)).toContain("Stripe API");
      expect(results.map((r) => r.name)).toContain("Main App");
    });

    it("should store results in database", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      await runHealthChecks();

      expect(mockSupabaseInsert).toHaveBeenCalledTimes(4);
    });

    it("should log alert when service is down", async () => {
      mockClerkClient.users.getUserList.mockRejectedValue(new Error("Clerk down"));
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      const clerkResult = results.find((r) => r.name === "Clerk Auth");
      expect(clerkResult?.status).toBe("down");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "system.health_alert",
        targetType: "system",
        metadata: expect.objectContaining({
          downServices: expect.arrayContaining(["Clerk Auth"]),
        }),
      });
    });

    it("should mark service as degraded when latency is high", async () => {
      // Simulate slow response by mocking setTimeout
      mockClerkClient.users.getUserList.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 2500))
      );
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      const clerkResult = results.find((r) => r.name === "Clerk Auth");
      expect(clerkResult?.status).toBe("degraded");
    });

    it("should handle missing MAIN_APP_URL gracefully", async () => {
      delete process.env.MAIN_APP_URL;
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      const mainAppResult = results.find((r) => r.name === "Main App");
      expect(mainAppResult?.status).toBe("healthy");
      expect(mainAppResult?.message).toContain("MAIN_APP_URL not configured");
    });
  });

  describe("getHealthCheckHistory", () => {
    it("should return recent health checks", async () => {
      const mockData = [
        {
          id: "check_1",
          service_name: "Supabase Database",
          status: "healthy",
          latency_ms: 45,
          error_message: null,
          checked_at: "2024-03-15T10:00:00Z",
        },
        {
          id: "check_2",
          service_name: "Clerk Auth",
          status: "degraded",
          latency_ms: 2500,
          error_message: null,
          checked_at: "2024-03-15T09:00:00Z",
        },
      ];

      mockSupabaseOrder.mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const result = await getHealthCheckHistory(50);

      expect(result).toHaveLength(2);
      expect(result[0].serviceName).toBe("Supabase Database");
      expect(result[1].status).toBe("degraded");
    });

    it("should throw error when database fails", async () => {
      mockSupabaseOrder.mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      await expect(getHealthCheckHistory()).rejects.toThrow("Failed to fetch health checks");
    });
  });

  describe("getLatestHealthStatus", () => {
    it("should return latest status for each service via RPC", async () => {
      const mockData = [
        {
          id: "check_1",
          service_name: "Supabase Database",
          status: "healthy",
          latency_ms: 45,
          error_message: null,
          checked_at: "2024-03-15T10:00:00Z",
        },
      ];

      mockSupabaseRpc.mockResolvedValue({ data: mockData, error: null });

      const result = await getLatestHealthStatus();

      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe("Supabase Database");
    });

    it("should fallback to manual query when RPC fails", async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC not found" },
      });

      const mockData = [
        {
          id: "check_1",
          service_name: "Supabase Database",
          status: "healthy",
          latency_ms: 45,
          error_message: null,
          checked_at: "2024-03-15T10:00:00Z",
        },
        {
          id: "check_2",
          service_name: "Supabase Database",
          status: "degraded",
          latency_ms: 100,
          error_message: null,
          checked_at: "2024-03-15T09:00:00Z",
        },
      ];

      mockSupabaseLimit.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getLatestHealthStatus();

      // Should only return the latest (first) entry for each service
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("healthy");
    });
  });
});
