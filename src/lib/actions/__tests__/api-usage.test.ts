import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase - define everything inside the factory to avoid hoisting issues
vi.mock("@/lib/supabase/admin", () => {
  // Create mock functions inside the factory
  const mockSupabaseSelect = vi.fn();
  const mockSupabaseEq = vi.fn();
  const mockSupabaseGte = vi.fn();
  const mockSupabaseLte = vi.fn();
  const mockSupabaseOrder = vi.fn();
  const mockSupabaseSingle = vi.fn();
  const mockSupabaseRpc = vi.fn();
  const mockSupabaseFrom = vi.fn();
  const mockSupabaseIn = vi.fn();

  // Setup the chain
  mockSupabaseFrom.mockReturnValue({
    select: mockSupabaseSelect,
    rpc: mockSupabaseRpc,
  });
  mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq,
    gte: mockSupabaseGte,
    lte: mockSupabaseLte,
    order: mockSupabaseOrder,
    in: mockSupabaseIn,
  });
  mockSupabaseEq.mockReturnValue({
    single: mockSupabaseSingle,
    order: mockSupabaseOrder,
    eq: mockSupabaseEq,
  });
  mockSupabaseGte.mockReturnValue({
    lte: mockSupabaseLte,
  });
  mockSupabaseLte.mockReturnValue({
    order: mockSupabaseOrder,
  });
  mockSupabaseOrder.mockReturnValue({
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
  // For getApiCallsThisMonth: .gte().lte() returns a thenable
  mockSupabaseGte.mockResolvedValue({ data: [], error: null });
  // For getApiCallsComparison: .in() returns a thenable
  mockSupabaseIn.mockResolvedValue({ data: [], error: null });

  return {
    supabaseAdmin: {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    },
    // Export mocks for test access
    mockSupabaseFrom,
    mockSupabaseSelect,
    mockSupabaseEq,
    mockSupabaseGte,
    mockSupabaseLte,
    mockSupabaseOrder,
    mockSupabaseSingle,
    mockSupabaseRpc,
    mockSupabaseIn,
  };
});

// Import the mocked module and functions
import {
  getApiCallsToday,
  getApiUsageHistory,
  getApiCallsThisMonth,
  getApiCallsComparison,
  recordApiCall,
} from "../api-usage";
import { 
  mockSupabaseFrom, 
  mockSupabaseSelect, 
  mockSupabaseEq, 
  mockSupabaseGte, 
  mockSupabaseLte, 
  mockSupabaseOrder, 
  mockSupabaseSingle, 
  mockSupabaseRpc,
  mockSupabaseIn,
} from "@/lib/supabase/admin";

describe("API Usage Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      rpc: mockSupabaseRpc,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
      in: mockSupabaseIn,
    });
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      order: mockSupabaseOrder,
      eq: mockSupabaseEq,
    });
    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte,
    });
    mockSupabaseLte.mockReturnValue({
      order: mockSupabaseOrder,
    });
    mockSupabaseOrder.mockReturnValue({
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe("getApiCallsToday", () => {
    it("should return today's API call count", async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { total_calls: 150 },
        error: null,
      });

      const result = await getApiCallsToday();

      expect(result).toBe(150);
      expect(mockSupabaseFrom).toHaveBeenCalledWith("api_usage_daily");
    });

    it("should return 0 when no record exists", async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getApiCallsToday();

      expect(result).toBe(0);
    });

    it("should return 0 on error", async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getApiCallsToday();

      expect(result).toBe(0);
    });
  });

  describe("getApiUsageHistory", () => {
    it("should return usage history for specified days", async () => {
      const mockData = [
        { date: "2024-03-01", total_calls: 100, unique_users: 10, unique_orgs: 5, endpoint_breakdown: {}, status_breakdown: {} },
        { date: "2024-03-02", total_calls: 150, unique_users: 15, unique_orgs: 8, endpoint_breakdown: {}, status_breakdown: {} },
      ];

      mockSupabaseOrder.mockReturnValue({
        data: mockData,
        error: null,
      });

      const result = await getApiUsageHistory(7);

      expect(result).toHaveLength(2);
      expect(result[0].total_calls).toBe(100);
    });

    it("should return empty array on error", async () => {
      mockSupabaseOrder.mockReturnValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getApiUsageHistory(7);

      expect(result).toEqual([]);
    });
  });

  describe("getApiCallsThisMonth", () => {
    it("should sum all calls for current month", async () => {
      // getApiCallsThisMonth uses: from().select().gte().lte() which returns a Promise
      mockSupabaseGte.mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          data: [
            { total_calls: 100 },
            { total_calls: 200 },
            { total_calls: 300 },
          ],
          error: null,
        }),
      });

      const result = await getApiCallsThisMonth();

      expect(result).toBe(600);
    });

    it("should return 0 when no data", async () => {
      mockSupabaseGte.mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await getApiCallsThisMonth();

      expect(result).toBe(0);
    });
  });

  describe("getApiCallsComparison", () => {
    it("should calculate growth percentage", async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // getApiCallsComparison uses: from().select().in() which returns a Promise
      mockSupabaseIn.mockResolvedValue({
        data: [
          { date: today, total_calls: 110 },
          { date: yesterday, total_calls: 100 },
        ],
        error: null,
      });

      const result = await getApiCallsComparison();

      expect(result.today).toBe(110);
      expect(result.yesterday).toBe(100);
      expect(result.change).toBe(10);
      expect(result.trend).toBe("up");
    });

    it("should handle no yesterday data", async () => {
      const today = new Date().toISOString().split("T")[0];

      mockSupabaseIn.mockResolvedValue({
        data: [{ date: today, total_calls: 100 }],
        error: null,
      });

      const result = await getApiCallsComparison();

      expect(result.change).toBe(0);
      expect(result.trend).toBe("neutral");
    });

    it("should detect downward trend", async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      mockSupabaseIn.mockResolvedValue({
        data: [
          { date: today, total_calls: 90 },
          { date: yesterday, total_calls: 100 },
        ],
        error: null,
      });

      const result = await getApiCallsComparison();

      expect(result.change).toBe(-10);
      expect(result.trend).toBe("down");
    });

    it("should return zeros on error", async () => {
      mockSupabaseIn.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getApiCallsComparison();

      expect(result.today).toBe(0);
      expect(result.yesterday).toBe(0);
      expect(result.change).toBe(0);
    });
  });

  describe("recordApiCall", () => {
    it("should record API call with all parameters", async () => {
      mockSupabaseRpc.mockResolvedValue({ error: null });

      await recordApiCall({
        endpoint: "/api/tests",
        statusCode: 200,
        userId: "user_123",
        orgId: "org_456",
      });

      expect(mockSupabaseRpc).toHaveBeenCalledWith("increment_api_calls", {
        p_endpoint: "/api/tests",
        p_status_code: 200,
        p_user_id: "user_123",
        p_org_id: "org_456",
      });
    });

    it("should record API call with minimal parameters", async () => {
      mockSupabaseRpc.mockResolvedValue({ error: null });

      await recordApiCall({
        endpoint: "/api/health",
        statusCode: 200,
      });

      expect(mockSupabaseRpc).toHaveBeenCalledWith("increment_api_calls", {
        p_endpoint: "/api/health",
        p_status_code: 200,
        p_user_id: undefined,
        p_org_id: undefined,
      });
    });

    it("should not throw on error", async () => {
      mockSupabaseRpc.mockResolvedValue({ error: { message: "DB error" } });

      await expect(
        recordApiCall({ endpoint: "/api/test", statusCode: 200 })
      ).resolves.not.toThrow();
    });
  });
});
