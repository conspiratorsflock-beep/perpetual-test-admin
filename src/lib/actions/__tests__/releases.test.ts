import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchReleases, getReleaseById, updateReleaseStatus, getReleaseMetrics } from "../releases";
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

function makeBaseReleaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    project_id: "p1",
    name: "Release 1",
    description: null,
    status: "released",
    target_date: "2024-06-15",
    created_by: "u1",
    updated_by: null,
    deleted_at: null,
    created_at: "2024-06-01T10:00:00Z",
    updated_at: "2024-06-01T10:00:00Z",
    projects: { name: "Project A" },
    ...overrides,
  };
}

describe("Releases Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["searchReleases", () => searchReleases()],
    ["getReleaseById", () => getReleaseById("r1")],
    ["updateReleaseStatus", () => updateReleaseStatus("r1", "released")],
    ["getReleaseMetrics", () => getReleaseMetrics()],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Releases Actions — searchReleases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeSearchChain(rows: unknown[], count: number | null, error: unknown = null) {
    const result = { data: rows, error, count };
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() => chain),
      then: vi.fn((resolve: unknown) =>
        Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
      ),
    };
    return {
      select: vi.fn(() => chain),
    };
  }

  it("applies filters and pagination and maps rows", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeSearchChain([makeBaseReleaseRow()], 1);
      return {};
    });

    const result = await searchReleases({ projectId: "p1", status: "released", limit: 10, offset: 0 });

    expect(result.releases).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.releases[0]).toMatchObject({
      id: "r1",
      projectId: "p1",
      projectName: "Project A",
      status: "released",
    });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeSearchChain([], null, { message: "boom" });
      return {};
    });

    await expect(searchReleases()).rejects.toThrow("Failed to fetch releases: boom");
  });
});

describe("Releases Actions — getReleaseById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeByIdChain(row: unknown | null, error: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: row, error })),
        })),
      })),
    };
  }

  it("returns mapped release when found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeByIdChain(makeBaseReleaseRow());
      return {};
    });

    const result = await getReleaseById("r1");
    expect(result).toMatchObject({ id: "r1", name: "Release 1" });
  });

  it("returns null when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeByIdChain(null);
      return {};
    });

    const result = await getReleaseById("missing");
    expect(result).toBeNull();
  });
});

describe("Releases Actions — updateReleaseStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeUpdateChain(error: unknown = null) {
    return {
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error })),
      })),
    };
  }

  it("updates and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeUpdateChain(null);
      return {};
    });

    await updateReleaseStatus("r1", "archived");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "release.update_status",
      targetType: "release",
      targetId: "r1",
      metadata: { status: "archived" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeUpdateChain({ message: "boom" });
      return {};
    });

    await expect(updateReleaseStatus("r1", "released")).rejects.toThrow("Failed to update release: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Releases Actions — getReleaseMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeMetricsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => Promise.resolve({ data: rows, error })),
    };
  }

  it("returns counts by wire status", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") {
        return makeMetricsChain([
          { status: "planned" },
          { status: "in_progress" },
          { status: "released" },
          { status: "archived" },
          { status: "released" },
        ]);
      }
      return {};
    });

    const result = await getReleaseMetrics();

    expect(result.total).toBe(5);
    expect(result.planned).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.released).toBe(2);
    expect(result.archived).toBe(1);
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "releases") return makeMetricsChain([], { message: "boom" });
      return {};
    });

    await expect(getReleaseMetrics()).rejects.toThrow("Failed to fetch release metrics: boom");
  });
});
