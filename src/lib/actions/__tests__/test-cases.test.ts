import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjectTestCases, getTestCaseById } from "../test-cases";
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

function makeBaseTestCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tc1",
    project_id: "p1",
    section_id: null,
    title: "Open login",
    description: "User opens login page",
    priority: "p0",
    status: "active",
    steps: [
      { order: 1, action: "Navigate", expected_result: "Page loads" },
    ],
    is_adhoc: false,
    created_by: "u1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    tc_sequence_number: 101,
    preconditions: null,
    external_id: null,
    automation_status: "manual",
    execution_mode: "manual",
    version: 1,
    is_latest_version: true,
    previous_version_id: null,
    version_notes: null,
    test_case_type: "standard",
    gherkin_content: null,
    gherkin_scenario_type: null,
    ...overrides,
  };
}

function makeListChain(rows: unknown[], count: number | null, error: unknown = null) {
  const result = { data: rows, error, count };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
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

describe("Test Cases Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("getProjectTestCases rejects before Supabase call", async () => {
    await expect(getProjectTestCases("p1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getTestCaseById rejects before Supabase call", async () => {
    await expect(getTestCaseById("tc1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Test Cases Actions — getProjectTestCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("filters by project, status, priority and maps rows", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_cases") return makeListChain([makeBaseTestCaseRow()], 1);
      return {};
    });

    const result = await getProjectTestCases("p1", { status: "active", priority: "p0", limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.testCases[0]).toMatchObject({
      id: "tc1",
      projectId: "p1",
      title: "Open login",
      priority: "p0",
      status: "active",
      tcSequenceNumber: 101,
      steps: [{ order: 1, action: "Navigate", expectedResult: "Page loads" }],
    });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_cases") return makeListChain([], null, { message: "fail" });
      return {};
    });

    await expect(getProjectTestCases("p1")).rejects.toThrow("Failed to fetch test cases: fail");
  });
});

describe("Test Cases Actions — getTestCaseById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns mapped test case when found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_cases") return makeSingleChain(makeBaseTestCaseRow());
      return {};
    });

    const result = await getTestCaseById("tc1");
    expect(result).toMatchObject({ id: "tc1", title: "Open login" });
  });

  it("returns null when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_cases") return makeSingleChain(null);
      return {};
    });

    const result = await getTestCaseById("missing");
    expect(result).toBeNull();
  });
});
