import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDashboardTrends } from "../dashboard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

describe("Dashboard Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("getDashboardTrends rejects before Supabase call", async () => {
    await expect(getDashboardTrends()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Dashboard Actions — getDashboardTrends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeTrendsChain(rows: Array<{ created_at: string }>) {
    return {
      gte: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    };
  }

  it("returns 14-day series with bucketed counts and trends", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn(() =>
            makeTrendsChain([
              { created_at: "2024-06-05T08:00:00Z" }, // prior half
              { created_at: "2024-06-12T08:00:00Z" }, // recent half
              { created_at: "2024-06-13T08:00:00Z" }, // recent half
            ])
          ),
        };
      }
      if (table === "organizations") {
        return {
          select: vi.fn(() =>
            makeTrendsChain([
              { created_at: "2024-06-05T08:00:00Z" },
              { created_at: "2024-06-12T08:00:00Z" },
              { created_at: "2024-06-13T08:00:00Z" },
            ])
          ),
        };
      }
      if (table === "api_usage_logs") {
        return {
          select: vi.fn(() =>
            makeTrendsChain([
              { created_at: "2024-06-05T08:00:00Z" },
              { created_at: "2024-06-12T08:00:00Z" },
            ])
          ),
        };
      }
      return {};
    });

    const result = await getDashboardTrends(14);

    expect(result.labels).toHaveLength(14);
    expect(result.labels[0]).toBe("2024-06-02");
    expect(result.labels[13]).toBe("2024-06-15");
    expect(result.newUsers).toHaveLength(14);
    expect(result.newOrgs).toHaveLength(14);
    expect(result.apiCalls).toHaveLength(14);

    expect(result.newUsers[3]).toBe(1); // 06-05
    expect(result.newUsers[10]).toBe(1); // 06-12
    expect(result.newUsers[11]).toBe(1); // 06-13
    expect(result.newUsers.reduce((a, b) => a + b, 0)).toBe(3);

    // prior 7 days (Jun 02-08) has 1; recent 7 (Jun 09-15) has 2 => +100% up
    expect(result.userChange).toMatchObject({ value: 100, trend: "up" });
    // prior 7 days has 1; recent 7 has 2 => +100% up
    expect(result.orgChange).toMatchObject({ value: 100, trend: "up" });
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it("returns zero series when no data", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "users" || table === "organizations" || table === "api_usage_logs") {
        return { select: vi.fn(() => makeTrendsChain([])) };
      }
      return {};
    });

    const result = await getDashboardTrends(14);

    expect(result.newUsers.every((v) => v === 0)).toBe(true);
    expect(result.newOrgs.every((v) => v === 0)).toBe(true);
    expect(result.apiCalls.every((v) => v === 0)).toBe(true);
    expect(result.userChange).toMatchObject({ value: 0, trend: "neutral" });
    expect(result.orgChange).toMatchObject({ value: 0, trend: "neutral" });
  });

  it("ignores rows outside the window", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn(() =>
            makeTrendsChain([
              { created_at: "2024-06-01T08:00:00Z" }, // before window
              { created_at: "2024-06-15T08:00:00Z" }, // in window
            ])
          ),
        };
      }
      if (table === "organizations" || table === "api_usage_logs") {
        return { select: vi.fn(() => makeTrendsChain([])) };
      }
      return {};
    });

    const result = await getDashboardTrends(14);

    expect(result.newUsers[13]).toBe(1); // 06-15
    expect(result.newUsers.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("silently treats Supabase errors as empty buckets (current behavior)", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "users" || table === "organizations" || table === "api_usage_logs") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } })),
          })),
        };
      }
      return {};
    });

    const result = await getDashboardTrends(14);

    expect(result.newUsers).toHaveLength(14);
    expect(result.newUsers.every((v) => v === 0)).toBe(true);
    // Source does not check { error }; reported as confirm-and-lock behavior.
  });
});
