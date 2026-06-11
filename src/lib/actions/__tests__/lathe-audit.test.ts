import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchLatheAuditLogs,
  getLatheAuditLogById,
  getLatheAuditResourceTypes,
} from "../lathe-audit";
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

function makeBaseAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "al1",
    user_id: "u1",
    org_id: "o1",
    project_id: "p1",
    action: "updated",
    resource_type: "test_case",
    resource_id: "tc1",
    old_value: { status: "draft" },
    new_value: { status: "active" },
    metadata: null,
    created_at: "2024-05-01T10:00:00Z",
    ...overrides,
  };
}

function makeSearchChain(rows: unknown[], count: number | null, error: unknown = null) {
  const result = { data: rows, error, count };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
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

function makeResourceTypesChain(rows: unknown[], error: unknown = null) {
  return {
    select: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
}

describe("Lathe Audit Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["searchLatheAuditLogs", () => searchLatheAuditLogs()],
    ["getLatheAuditLogById", () => getLatheAuditLogById("al1")],
    ["getLatheAuditResourceTypes", () => getLatheAuditResourceTypes()],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Lathe Audit Actions — searchLatheAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("queries audit_logs table and maps rows", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") return makeSearchChain([makeBaseAuditRow()], 1);
      return {};
    });

    const result = await searchLatheAuditLogs({
      resourceType: "test_case",
      resourceId: "tc1",
      action: "updated",
      userId: "u1",
      orgId: "o1",
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(result.logs[0]).toMatchObject({
      id: "al1",
      userId: "u1",
      orgId: "o1",
      action: "updated",
      resourceType: "test_case",
      resourceId: "tc1",
      oldValue: { status: "draft" },
      newValue: { status: "active" },
    });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") return makeSearchChain([], null, { message: "boom" });
      return {};
    });

    await expect(searchLatheAuditLogs()).rejects.toThrow("Failed to fetch audit logs: boom");
  });
});

describe("Lathe Audit Actions — getLatheAuditLogById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns mapped log when found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") return makeSingleChain(makeBaseAuditRow());
      return {};
    });

    const result = await getLatheAuditLogById("al1");
    expect(result).toMatchObject({ id: "al1", resourceType: "test_case" });
  });

  it("returns null when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") return makeSingleChain(null);
      return {};
    });

    const result = await getLatheAuditLogById("missing");
    expect(result).toBeNull();
  });
});

describe("Lathe Audit Actions — getLatheAuditResourceTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns distinct sorted resource types", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return makeResourceTypesChain([
          { resource_type: "test_run" },
          { resource_type: "test_case" },
          { resource_type: "test_case" },
          { resource_type: null },
        ]);
      }
      return {};
    });

    const result = await getLatheAuditResourceTypes();
    expect(result).toEqual(["test_case", "test_run"]);
  });

  it("returns empty array on DB error without throwing", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") return makeResourceTypesChain([], { message: "boom" });
      return {};
    });

    const result = await getLatheAuditResourceTypes();
    expect(result).toEqual([]);
  });
});
