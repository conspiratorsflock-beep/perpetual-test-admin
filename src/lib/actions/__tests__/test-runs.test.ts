import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjectTestRuns, getTestRunById } from "../test-runs";
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

function makeBaseTestRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tr1",
    project_id: "p1",
    release_id: "r1",
    build_id: "b1",
    name: "Smoke Run 1",
    description: null,
    environment: "staging",
    custom_environment: null,
    status: "running",
    inheritance_policy: "live",
    parent_run_id: null,
    created_by: "u1",
    started_at: "2024-01-02T00:00:00Z",
    completed_at: null,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    run_sequence_number: 7,
    configuration_count: 3,
    ...overrides,
  };
}

function makeListChain(rows: unknown[], count: number | null, error: unknown = null) {
  const result = { data: rows, error, count };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return { select: vi.fn(() => chain) };
}

function makeSingleChain(row: unknown | null, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: row, error })),
      })),
    })),
  };
}

describe("Test Runs Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("getProjectTestRuns rejects before Supabase call", async () => {
    await expect(getProjectTestRuns("p1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getTestRunById rejects before Supabase call", async () => {
    await expect(getTestRunById("tr1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Test Runs Actions — getProjectTestRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("filters by project, status and maps rows", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_runs") return makeListChain([makeBaseTestRunRow()], 1);
      return {};
    });

    const result = await getProjectTestRuns("p1", { status: "running", limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.testRuns[0]).toMatchObject({
      id: "tr1",
      projectId: "p1",
      releaseId: "r1",
      buildId: "b1",
      status: "running",
      runSequenceNumber: 7,
      configurationCount: 3,
      inheritancePolicy: "live",
    });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_runs") return makeListChain([], null, { message: "fail" });
      return {};
    });

    await expect(getProjectTestRuns("p1")).rejects.toThrow("Failed to fetch test runs: fail");
  });
});

describe("Test Runs Actions — getTestRunById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns mapped test run when found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_runs") return makeSingleChain(makeBaseTestRunRow());
      return {};
    });

    const result = await getTestRunById("tr1");
    expect(result).toMatchObject({ id: "tr1", name: "Smoke Run 1" });
  });

  it("returns null when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_runs") return makeSingleChain(null);
      return {};
    });

    const result = await getTestRunById("missing");
    expect(result).toBeNull();
  });
});
