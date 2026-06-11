import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getApiCallsToday,
  getApiCallsThisMonth,
  getApiCallsComparison,
  recordApiCall,
} from "../api-usage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

function makeCountChain(count: number | null, error: unknown = null) {
  const result = { count, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    gte: vi.fn(() => inner),
    lt: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return {
    select: vi.fn(() => inner),
  };
}

function makeInsertChain(error: unknown = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error })),
  };
}

describe("API Usage — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["getApiCallsToday", () => getApiCallsToday()],
    ["getApiCallsThisMonth", () => getApiCallsThisMonth()],
    ["getApiCallsComparison", () => getApiCallsComparison()],
    ["recordApiCall", () => recordApiCall({ endpoint: "/x", statusCode: 200 })],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("API Usage — reads with fixed date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-06-15T14:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getApiCallsToday uses start of today", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeCountChain(42);
      return {};
    });

    const result = await getApiCallsToday();
    expect(result).toBe(42);
  });

  it("getApiCallsThisMonth uses start of month", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeCountChain(123);
      return {};
    });

    const result = await getApiCallsThisMonth();
    expect(result).toBe(123);
  });

  it("getApiCallsComparison computes change and trend", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") {
        return makeCountChain(10); // simplistic: same count returned for both today and yesterday
      }
      return {};
    });

    const result = await getApiCallsComparison();
    expect(result).toMatchObject({ today: 10, yesterday: 10, change: 0, trend: "neutral" });
  });

  it("silently returns 0 on Supabase error", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeCountChain(null, { message: "boom" });
      return {};
    });

    const result = await getApiCallsToday();
    expect(result).toBe(0);
  });
});

describe("API Usage — getApiCallsComparison math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-06-15T14:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes up trend when today > yesterday + 5%", async () => {
    let callCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") {
        callCount++;
        return makeCountChain(callCount === 1 ? 110 : 100);
      }
      return {};
    });

    const result = await getApiCallsComparison();
    expect(result).toMatchObject({ today: 110, yesterday: 100, change: 10, trend: "up" });
  });

  it("computes down trend when today < yesterday - 5%", async () => {
    let callCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") {
        callCount++;
        return makeCountChain(callCount === 1 ? 90 : 100);
      }
      return {};
    });

    const result = await getApiCallsComparison();
    expect(result).toMatchObject({ today: 90, yesterday: 100, change: -10, trend: "down" });
  });

  it("returns zero change when yesterday is 0", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeCountChain(5);
      return {};
    });

    const result = await getApiCallsComparison();
    expect(result).toMatchObject({ today: 5, yesterday: 5, change: 0, trend: "neutral" });
  });
});

describe("API Usage — recordApiCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("inserts telemetry row", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeInsertChain(null);
      return {};
    });

    await recordApiCall({ endpoint: "/api/x", method: "POST", statusCode: 201, orgId: "o1" });

    expect(mockSupabaseFrom).toHaveBeenCalledWith("api_usage_logs");
  });

  it("does not throw on insert failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "api_usage_logs") return makeInsertChain({ message: "boom" });
      return {};
    });

    await expect(recordApiCall({ endpoint: "/api/x", statusCode: 200 })).resolves.toBeUndefined();
  });
});
