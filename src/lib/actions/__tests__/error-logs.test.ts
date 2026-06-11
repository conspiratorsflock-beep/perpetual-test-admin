import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logError,
  getErrorLogs,
  getErrorStats,
  purgeOldErrors,
  exportErrorLogsToCSV,
} from "../error-logs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockLogAdminAction = vi.mocked(logAdminAction);

function makeBaseLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    error_type: "TypeError",
    message: "Cannot read property",
    stack_trace: "at foo (bar.js:1:1)",
    user_id: "u1",
    org_id: "o1",
    path: "/api/x",
    metadata: { detail: "x" },
    created_at: "2024-06-15T12:00:00Z",
    ...overrides,
  };
}

function makeSearchChain(rows: unknown[], count: number | null, error: unknown = null) {
  const result = { data: rows, error, count };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    ilike: vi.fn(() => inner),
    gte: vi.fn(() => inner),
    lte: vi.fn(() => inner),
    or: vi.fn(() => inner),
    order: vi.fn(() => inner),
    range: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return { select: vi.fn(() => inner) };
}

function makeExportChain(rows: unknown[], error: unknown = null) {
  const result = { data: rows, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    gte: vi.fn(() => inner),
    lte: vi.fn(() => inner),
    order: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return { select: vi.fn(() => inner) };
}

function makeDeleteChain(count: number | null, error: unknown = null) {
  const result = { count, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    lt: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return { delete: vi.fn(() => inner) };
}

function makeInsertChain(error: unknown = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error })),
  };
}

function makeStatsChain(rows: unknown[], error: unknown = null) {
  return {
    select: vi.fn(() => ({
      gte: vi.fn(() => Promise.resolve({ data: rows, error })),
    })),
  };
}

describe("Error Logs — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["logError", () => logError({ errorType: "x", message: "m" })],
    ["getErrorLogs", () => getErrorLogs()],
    ["getErrorStats", () => getErrorStats()],
    ["purgeOldErrors", () => purgeOldErrors()],
    ["exportErrorLogsToCSV", () => exportErrorLogsToCSV()],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Error Logs — logError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("inserts error row when admin", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeInsertChain(null);
      return {};
    });

    await logError({ errorType: "TypeError", message: "boom", userId: "u1" });

    expect(mockSupabaseFrom).toHaveBeenCalledWith("admin_error_logs");
  });

  it("does not throw on insert failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeInsertChain({ message: "fail" });
      return {};
    });

    await expect(logError({ errorType: "x", message: "m" })).resolves.toBeUndefined();
  });
});

describe("Error Logs — getErrorLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("applies filters and maps rows", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeSearchChain([makeBaseLogRow()], 1);
      return {};
    });

    const result = await getErrorLogs({
      errorType: "TypeError",
      userId: "u1",
      orgId: "o1",
      path: "/api",
      startDate: "2024-06-01",
      endDate: "2024-06-30",
      search: "read",
      limit: 10,
      offset: 0,
    });

    expect(result.count).toBe(1);
    expect(result.logs[0]).toMatchObject({ id: "e1", errorType: "TypeError", message: "Cannot read property" });
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeSearchChain([], null, { message: "boom" });
      return {};
    });

    await expect(getErrorLogs()).rejects.toThrow("Failed to fetch error logs: boom");
  });
});

describe("Error Logs — getErrorStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tallies totals by type and path", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") {
        return makeStatsChain([
          { error_type: "TypeError", path: "/api/x" },
          { error_type: "TypeError", path: "/api/y" },
          { error_type: "ReferenceError", path: null },
        ]);
      }
      return {};
    });

    const result = await getErrorStats(24);
    expect(result.total).toBe(3);
    expect(result.byType).toEqual({ TypeError: 2, ReferenceError: 1 });
    expect(result.byPath).toEqual({ "/api/x": 1, "/api/y": 1 });
  });
});

describe("Error Logs — purgeOldErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes before cutoff and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeDeleteChain(7, null);
      return {};
    });

    const result = await purgeOldErrors(30);
    expect(result.deleted).toBe(7);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "system.purge_errors",
      targetType: "system",
      metadata: { daysToKeep: 30, deleted: 7 },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeDeleteChain(null, { message: "boom" });
      return {};
    });

    await expect(purgeOldErrors(30)).rejects.toThrow("Failed to purge old errors: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Error Logs — exportErrorLogsToCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("exports rows with RFC 4180 quote escaping and filters", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") {
        return makeExportChain([
          makeBaseLogRow({
            id: "e1",
            error_type: "TypeError",
            message: 'Say "hello", then newline\nhere',
            path: "/api/x,y",
            user_id: "u1",
            org_id: "o1",
            created_at: "2024-06-15T12:00:00Z",
          }),
        ]);
      }
      return {};
    });

    const csv = await exportErrorLogsToCSV({ startDate: "2024-06-01", endDate: "2024-06-30", errorType: "TypeError" });

    expect(csv).toContain('"Say ""hello"", then newline\nhere"');
    expect(csv).toContain("/api/x,y");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("ID,Error Type,Message,Path,User ID,Org ID,Created At");
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "admin_error_logs") return makeExportChain([], { message: "boom" });
      return {};
    });

    await expect(exportErrorLogsToCSV()).rejects.toThrow("Failed to export error logs: boom");
  });
});
