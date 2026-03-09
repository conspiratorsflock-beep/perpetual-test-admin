import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase - define everything inside the factory
vi.mock("@/lib/supabase/admin", () => {
  const mockSupabaseFrom = vi.fn();
  const mockSupabaseInsert = vi.fn();
  const mockSupabaseSelect = vi.fn();
  const mockSupabaseDelete = vi.fn();
  const mockSupabaseEq = vi.fn();
  const mockSupabaseGte = vi.fn();
  const mockSupabaseLte = vi.fn();
  const mockSupabaseOrder = vi.fn();
  const mockSupabaseRange = vi.fn();
  const mockSupabaseIlike = vi.fn();
  const mockSupabaseOr = vi.fn();
  const mockSupabaseLt = vi.fn();

  // Setup chain
  mockSupabaseFrom.mockReturnValue({
    insert: mockSupabaseInsert,
    select: mockSupabaseSelect,
    delete: mockSupabaseDelete,
  });
  mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq,
    gte: mockSupabaseGte,
    lte: mockSupabaseLte,
    order: mockSupabaseOrder,
    ilike: mockSupabaseIlike,
    or: mockSupabaseOr,
  });
  mockSupabaseEq.mockReturnValue({
    eq: mockSupabaseEq,
    gte: mockSupabaseGte,
    lte: mockSupabaseLte,
    order: mockSupabaseOrder,
    range: mockSupabaseRange,
    ilike: mockSupabaseIlike,
    or: mockSupabaseOr,
  });
  mockSupabaseGte.mockReturnValue({
    lte: mockSupabaseLte,
    order: mockSupabaseOrder,
    eq: mockSupabaseEq,
  });
  mockSupabaseLte.mockReturnValue({
    order: mockSupabaseOrder,
    eq: mockSupabaseEq,
  });
  mockSupabaseOrder.mockReturnValue({
    range: mockSupabaseRange,
  });
  mockSupabaseRange.mockResolvedValue({
    data: [],
    error: null,
    count: 0,
  });
  mockSupabaseIlike.mockReturnValue({
    order: mockSupabaseOrder,
    eq: mockSupabaseEq,
    gte: mockSupabaseGte,
    lte: mockSupabaseLte,
    or: mockSupabaseOr,
  });
  mockSupabaseOr.mockReturnValue({
    order: mockSupabaseOrder,
    eq: mockSupabaseEq,
    gte: mockSupabaseGte,
    lte: mockSupabaseLte,
    range: mockSupabaseRange,
  });
  mockSupabaseDelete.mockReturnValue({
    lt: mockSupabaseLt,
  });
  // getErrorStats uses .gte() as the final chain - it returns a Promise
  mockSupabaseGte.mockResolvedValue({ data: [], error: null });

  return {
    supabaseAdmin: {
      from: mockSupabaseFrom,
    },
    // Export mocks for test access
    mockSupabaseFrom,
    mockSupabaseInsert,
    mockSupabaseSelect,
    mockSupabaseDelete,
    mockSupabaseEq,
    mockSupabaseGte,
    mockSupabaseLte,
    mockSupabaseOrder,
    mockSupabaseRange,
    mockSupabaseIlike,
    mockSupabaseOr,
    mockSupabaseLt,
  };
});

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Import the mocked module and functions
import {
  logError,
  getErrorLogs,
  getErrorStats,
  purgeOldErrors,
  exportErrorLogsToCSV,
} from "../error-logs";
import {
  mockSupabaseFrom,
  mockSupabaseInsert,
  mockSupabaseSelect,
  mockSupabaseDelete,
  mockSupabaseEq,
  mockSupabaseGte,
  mockSupabaseLte,
  mockSupabaseOrder,
  mockSupabaseRange,
  mockSupabaseIlike,
  mockSupabaseOr,
  mockSupabaseLt,
} from "@/lib/supabase/admin";

describe("Error Logs Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));

    // Create a query builder that supports the mutable query pattern
    // where filter methods return the query builder for chaining
    // The query builder is thenable - when awaited it resolves to the data
    const createQueryBuilder = (resolveValue = { data: [], error: null, count: 0 }) => {
      const builder = {
        eq: vi.fn(function() { return this; }),
        ilike: vi.fn(function() { return this; }),
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        or: vi.fn(function() { return this; }),
        order: vi.fn(function() { return this; }),
        range: vi.fn(function() { 
          // Store the resolve value so then() can use it
          builder._resolveValue = resolveValue;
          return builder; 
        }),
        // Make the builder thenable so it can be awaited
        then: function(resolve: (value: typeof resolveValue) => void) {
          resolve(builder._resolveValue || resolveValue);
          return this;
        },
        _resolveValue: resolveValue,
      };
      return builder;
    };

    // Reset chain
    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
      delete: mockSupabaseDelete,
    });
    
    // For getErrorLogs: select() returns an object with order() method
    // order() returns a query builder with filter methods and range()
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
      ilike: mockSupabaseIlike,
      or: mockSupabaseOr,
    });
    
    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
      range: mockSupabaseRange,
      ilike: mockSupabaseIlike,
      or: mockSupabaseOr,
    });
    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
      eq: mockSupabaseEq,
    });
    mockSupabaseLte.mockReturnValue({
      order: mockSupabaseOrder,
      eq: mockSupabaseEq,
    });
    // For getErrorLogs: order() returns a query builder with filter methods and range()
    mockSupabaseOrder.mockReturnValue(createQueryBuilder());
    mockSupabaseRange.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });
    mockSupabaseIlike.mockReturnValue({
      order: mockSupabaseOrder,
      eq: mockSupabaseEq,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      or: mockSupabaseOr,
    });
    mockSupabaseOr.mockReturnValue({
      order: mockSupabaseOrder,
      eq: mockSupabaseEq,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      range: mockSupabaseRange,
    });
    mockSupabaseDelete.mockReturnValue({
      lt: mockSupabaseLt,
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("logError", () => {
    it("should log error with all fields", async () => {
      await logError({
        errorType: "api_error",
        message: "Database connection failed",
        stackTrace: "Error at line 42",
        userId: "user_123",
        orgId: "org_456",
        path: "/api/users",
        metadata: { requestId: "req_789" },
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        error_type: "api_error",
        message: "Database connection failed",
        stack_trace: "Error at line 42",
        user_id: "user_123",
        org_id: "org_456",
        path: "/api/users",
        metadata: { requestId: "req_789" },
      });
    });

    it("should log error with minimal fields", async () => {
      await logError({
        errorType: "auth_error",
        message: "Invalid token",
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        error_type: "auth_error",
        message: "Invalid token",
        stack_trace: null,
        user_id: null,
        org_id: null,
        path: null,
        metadata: {},
      });
    });

    it("should not throw on error", async () => {
      mockSupabaseInsert.mockResolvedValue({ error: { message: "DB error" } });

      await expect(
        logError({ errorType: "test", message: "test" })
      ).resolves.not.toThrow();
    });
  });

  describe("getErrorLogs", () => {
    it("should return logs with pagination", async () => {
      const mockData = [
        {
          id: "err_1",
          error_type: "api_error",
          message: "Test error",
          stack_trace: null,
          user_id: "user_123",
          org_id: null,
          path: "/api/test",
          metadata: {},
          created_at: "2024-03-15T10:00:00Z",
        },
      ];

      // getErrorLogs uses query builder pattern
      mockSupabaseOrder.mockReturnValue({
        eq: vi.fn(function() { return this; }),
        ilike: vi.fn(function() { return this; }),
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        or: vi.fn(function() { return this; }),
        range: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
          count: 1,
        }),
      });

      const result = await getErrorLogs({ limit: 50, offset: 0 });

      expect(result.logs).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.logs[0].errorType).toBe("api_error");
    });

    it("should apply filters correctly", async () => {
      // getErrorLogs uses a query builder pattern: select().order().range() 
      // then chains filter methods that return the query builder
      // The query builder is thenable (can be awaited)
      const mockQueryBuilder = {
        eq: vi.fn(function() { return this; }),
        ilike: vi.fn(function() { return this; }),
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        or: vi.fn(function() { return this; }),
        range: vi.fn(function() { return this; }),
        then: vi.fn(function(resolve) {
          resolve({ data: [], error: null, count: 0 });
          return this;
        }),
      };
      
      // The order() method should return the query builder
      mockSupabaseOrder.mockReturnValue(mockQueryBuilder);

      await getErrorLogs({
        errorType: "api_error",
        userId: "user_123",
        orgId: "org_456",
        path: "/api",
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        search: "error",
      });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("error_type", "api_error");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", "user_123");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("org_id", "org_456");
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("path", "%/api%");
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("created_at", "2024-03-01");
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("created_at", "2024-03-15");
      expect(mockQueryBuilder.or).toHaveBeenCalledWith("message.ilike.%error%,error_type.ilike.%error%");
    });

    it("should throw error when database fails", async () => {
      mockSupabaseOrder.mockReturnValue({
        eq: vi.fn(function() { return this; }),
        ilike: vi.fn(function() { return this; }),
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        or: vi.fn(function() { return this; }),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
          count: 0,
        }),
      });

      await expect(getErrorLogs()).rejects.toThrow("Failed to fetch error logs");
    });
  });

  describe("getErrorStats", () => {
    it("should return error statistics", async () => {
      const mockData = [
        { error_type: "api_error", path: "/api/users" },
        { error_type: "api_error", path: "/api/orgs" },
        { error_type: "db_error", path: "/api/users" },
      ];

      // getErrorStats uses: from().select().gte() - gte is the final call
      mockSupabaseGte.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getErrorStats(24);

      expect(result.total).toBe(3);
      expect(result.byType["api_error"]).toBe(2);
      expect(result.byType["db_error"]).toBe(1);
      expect(result.byPath["/api/users"]).toBe(2);
    });

    it("should throw error when database fails", async () => {
      // getErrorStats uses: from().select().gte() - gte is the final call
      mockSupabaseGte.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(getErrorStats()).rejects.toThrow("Failed to fetch error stats");
    });
  });

  describe("purgeOldErrors", () => {
    it("should delete old errors and log action", async () => {
      mockSupabaseLt.mockResolvedValue({ error: null, count: 100 });

      const result = await purgeOldErrors(30);

      expect(result.deleted).toBe(100);
    });

    it("should throw error when delete fails", async () => {
      mockSupabaseLt.mockResolvedValue({ error: { message: "Delete failed" } });

      await expect(purgeOldErrors()).rejects.toThrow("Failed to purge old errors");
    });
  });

  describe("exportErrorLogsToCSV", () => {
    it("should return CSV formatted data", async () => {
      const mockData = [
        {
          id: "err_1",
          error_type: "api_error",
          message: 'Test "quoted" error',
          path: "/api/test",
          user_id: "user_123",
          org_id: "org_456",
          created_at: "2024-03-15T10:00:00Z",
        },
      ];

      // exportErrorLogsToCSV uses: from().select().order() 
      // The query builder pattern returns itself from filter methods
      // We need to create a mock query builder that supports async iteration
      const mockQueryBuilder = {
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        eq: vi.fn(function() { return this; }),
        then: vi.fn(function(resolve) {
          resolve({ data: mockData, error: null });
          return this;
        }),
      };
      
      mockSupabaseOrder.mockReturnValue(mockQueryBuilder);

      const result = await exportErrorLogsToCSV();

      expect(result).toContain("ID,Error Type,Message,Path,User ID,Org ID,Created At");
      expect(result).toContain("err_1");
      expect(result).toContain("api_error");
      // Should escape quotes in CSV
      expect(result).toContain('"Test ""quoted"" error"');
    });

    it("should apply date filters", async () => {
      const mockQueryBuilder = {
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        eq: vi.fn(function() { return this; }),
        then: vi.fn(function(resolve) {
          resolve({ data: [], error: null });
          return this;
        }),
      };
      
      mockSupabaseOrder.mockReturnValue(mockQueryBuilder);

      await exportErrorLogsToCSV({
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        errorType: "api_error",
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("created_at", "2024-03-01");
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("created_at", "2024-03-15");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("error_type", "api_error");
    });

    it("should throw error when database fails", async () => {
      const mockQueryBuilder = {
        gte: vi.fn(function() { return this; }),
        lte: vi.fn(function() { return this; }),
        eq: vi.fn(function() { return this; }),
        then: vi.fn(function(resolve) {
          resolve({ data: null, error: { message: "Database error" } });
          return this;
        }),
      };
      
      mockSupabaseOrder.mockReturnValue(mockQueryBuilder);

      await expect(exportErrorLogsToCSV()).rejects.toThrow("Failed to export error logs");
    });
  });
});
