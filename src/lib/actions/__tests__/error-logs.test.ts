import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logError,
  getErrorLogs,
  getErrorStats,
  purgeOldErrors,
  exportErrorLogsToCSV,
} from "../error-logs";
import { logAdminAction } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Supabase
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

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

describe("Error Logs Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));

    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
      delete: mockSupabaseDelete,
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
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
    });
    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
    });
    mockSupabaseLte.mockReturnValue({
      order: mockSupabaseOrder,
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
    });
    mockSupabaseOr.mockReturnValue({
      order: mockSupabaseOrder,
    });
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

      mockSupabaseRange.mockResolvedValue({
        data: mockData,
        error: null,
        count: 1,
      });

      const result = await getErrorLogs({ limit: 50, offset: 0 });

      expect(result.logs).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.logs[0].errorType).toBe("api_error");
    });

    it("should apply filters correctly", async () => {
      mockSupabaseRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await getErrorLogs({
        errorType: "api_error",
        userId: "user_123",
        orgId: "org_456",
        path: "/api",
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        search: "error",
      });

      expect(mockSupabaseEq).toHaveBeenCalledWith("error_type", "api_error");
      expect(mockSupabaseEq).toHaveBeenCalledWith("user_id", "user_123");
      expect(mockSupabaseEq).toHaveBeenCalledWith("org_id", "org_456");
      expect(mockSupabaseIlike).toHaveBeenCalledWith("path", "%/api%");
    });

    it("should throw error when database fails", async () => {
      mockSupabaseRange.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
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

      mockSupabaseGte.mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const result = await getErrorStats(24);

      expect(result.total).toBe(3);
      expect(result.byType["api_error"]).toBe(2);
      expect(result.byType["db_error"]).toBe(1);
      expect(result.byPath["/api/users"]).toBe(2);
    });

    it("should throw error when database fails", async () => {
      mockSupabaseGte.mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      await expect(getErrorStats()).rejects.toThrow("Failed to fetch error stats");
    });
  });

  describe("purgeOldErrors", () => {
    it("should delete old errors and log action", async () => {
      mockSupabaseDelete.mockReturnValue({
        lt: vi.fn().mockResolvedValue({ error: null, count: 100 }),
      });

      const result = await purgeOldErrors(30);

      expect(result.deleted).toBe(100);
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "system.purge_errors",
        targetType: "system",
        metadata: { daysToKeep: 30, deleted: 100 },
      });
    });

    it("should throw error when delete fails", async () => {
      mockSupabaseDelete.mockReturnValue({
        lt: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

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

      mockSupabaseGte.mockReturnValue({
        lte: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await exportErrorLogsToCSV();

      expect(result).toContain("ID,Error Type,Message,Path,User ID,Org ID,Created At");
      expect(result).toContain("err_1");
      expect(result).toContain("api_error");
      // Should escape quotes in CSV
      expect(result).toContain('"Test ""quoted"" error"');
    });

    it("should apply date filters", async () => {
      mockSupabaseGte.mockReturnValue({
        lte: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      await exportErrorLogsToCSV({
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        errorType: "api_error",
      });

      expect(mockSupabaseGte).toHaveBeenCalledWith("created_at", "2024-03-01");
    });

    it("should throw error when database fails", async () => {
      mockSupabaseGte.mockReturnValue({
        lte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      await expect(exportErrorLogsToCSV()).rejects.toThrow("Failed to export error logs");
    });
  });
});
