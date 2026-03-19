import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Stripe
vi.mock("@/lib/stripe/client", () => {
  const mockStripeCustomersList = vi.fn();
  
  return {
    stripe: {
      customers: { list: mockStripeCustomersList },
    },
    isStripeConfigured: true,
    mockStripeCustomersList,
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => {
  const mockClerkUsersGetUserList = vi.fn();
  
  return {
    clerkClient: () =>
      Promise.resolve({
        users: {
          getUserList: mockClerkUsersGetUserList,
        },
      }),
    mockClerkUsersGetUserList,
  };
});

// Mock Supabase
vi.mock("@/lib/supabase/admin", () => {
  const mockSupabaseFrom = vi.fn();
  const mockSupabaseInsert = vi.fn();
  const mockSupabaseSelect = vi.fn();
  const mockSupabaseOrder = vi.fn();
  const mockSupabaseLimit = vi.fn();
  const mockSupabaseRpc = vi.fn();

  // Setup chain
  mockSupabaseFrom.mockReturnValue({
    insert: mockSupabaseInsert,
    select: mockSupabaseSelect,
  });
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
  mockSupabaseInsert.mockResolvedValue({ error: null });

  return {
    supabaseAdmin: {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    },
    // Export mocks for test access
    mockSupabaseFrom,
    mockSupabaseInsert,
    mockSupabaseSelect,
    mockSupabaseOrder,
    mockSupabaseLimit,
    mockSupabaseRpc,
  };
});

// Import the mocked module and functions
import {
  runHealthChecks,
  getHealthCheckHistory,
  getLatestHealthStatus,
} from "../system-health";
import { mockClerkUsersGetUserList } from "@clerk/nextjs/server";
import { mockStripeCustomersList } from "@/lib/stripe/client";
import {
  mockSupabaseFrom,
  mockSupabaseInsert,
  mockSupabaseSelect,
  mockSupabaseOrder,
  mockSupabaseLimit,
  mockSupabaseRpc,
} from "@/lib/supabase/admin";

describe("System Health Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));

    // Reset chain
    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
    });
    mockSupabaseSelect.mockReturnValue({
      order: mockSupabaseOrder,
    });
    mockSupabaseOrder.mockReturnValue({
      order: mockSupabaseOrder, // supports chained .order().order()
      limit: mockSupabaseLimit,
      // Make the result awaitable so double-.order() chains resolve correctly
      then: (
        onFulfilled: (v: unknown) => unknown,
        onRejected: (e: unknown) => unknown
      ) => Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
    });
    mockSupabaseLimit.mockResolvedValue({
      data: [],
      error: null,
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("runHealthChecks", () => {
    it("should check all services and return results", async () => {
      mockClerkUsersGetUserList.mockResolvedValue({ data: [], totalCount: 0 });
      mockStripeCustomersList.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.name)).toContain("Supabase Database");
      expect(results.map((r) => r.name)).toContain("Clerk Auth");
      expect(results.map((r) => r.name)).toContain("Stripe API");
      expect(results.map((r) => r.name)).toContain("Main App");
    });

    it("should store results in database", async () => {
      mockClerkUsersGetUserList.mockResolvedValue({ data: [] });
      mockStripeCustomersList.mockResolvedValue({ data: [] });

      await runHealthChecks();

      // All 4 results are stored in a single bulk insert
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(1);
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ service_name: "Supabase Database" }),
          expect.objectContaining({ service_name: "Clerk Auth" }),
          expect.objectContaining({ service_name: "Stripe API" }),
          expect.objectContaining({ service_name: "Main App" }),
        ])
      );
    });

    it("should log alert when service is down", async () => {
      mockClerkUsersGetUserList.mockRejectedValue(new Error("Clerk down"));
      mockStripeCustomersList.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      const clerkResult = results.find((r) => r.name === "Clerk Auth");
      expect(clerkResult?.status).toBe("down");
    });

    it("should mark service as degraded when latency is high", async () => {
      // Use real timers for this test since latency calculation depends on Date.now()
      vi.useRealTimers();
      
      // Simulate slow response 
      mockClerkUsersGetUserList.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 2500))
      );
      mockStripeCustomersList.mockResolvedValue({ data: [] });

      const results = await runHealthChecks();

      const clerkResult = results.find((r) => r.name === "Clerk Auth");
      expect(clerkResult?.status).toBe("degraded");
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    }, 10000);

    it("should handle missing MAIN_APP_URL gracefully", async () => {
      delete process.env.MAIN_APP_URL;
      mockClerkUsersGetUserList.mockResolvedValue({ data: [] });
      mockStripeCustomersList.mockResolvedValue({ data: [] });

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

      // The fallback uses .select().order().order() (no .limit()), so we make
      // mockSupabaseOrder resolve to mockData when awaited directly.
      mockSupabaseOrder.mockReturnValue({
        order: mockSupabaseOrder,
        limit: mockSupabaseLimit,
        then: (
          onFulfilled: (v: unknown) => unknown,
          onRejected: (e: unknown) => unknown
        ) =>
          Promise.resolve({ data: mockData, error: null }).then(
            onFulfilled,
            onRejected
          ),
      });

      const result = await getLatestHealthStatus();

      // Should only return the latest (first) entry for each service
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("healthy");
    });
  });
});
