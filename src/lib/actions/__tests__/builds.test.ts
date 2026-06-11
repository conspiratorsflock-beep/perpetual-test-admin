import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchBuilds,
  getBuildById,
  updateBuildStatus,
  assignBuildToProject,
  getBuildMetrics,
} from "../builds";
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

function makeBaseBuildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    project_id: "p1",
    release_id: "r1",
    name: "Build 1",
    description: null,
    status: "completed",
    start_date: "2024-06-01T10:00:00Z",
    end_date: "2024-06-01T11:00:00Z",
    source: "manual",
    source_metadata: null,
    api_key_id: null,
    cicd_provider: "github",
    cicd_external_id: null,
    cicd_run_url: null,
    cicd_artifacts: null,
    created_by: "u1",
    updated_by: null,
    deleted_at: null,
    jira_version_id: null,
    created_at: "2024-06-01T10:00:00Z",
    updated_at: "2024-06-01T10:00:00Z",
    projects: { name: "Project A" },
    releases: { name: "Release 1" },
    ...overrides,
  };
}

describe("Builds Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["searchBuilds", () => searchBuilds()],
    ["getBuildById", () => getBuildById("b1")],
    ["updateBuildStatus", () => updateBuildStatus("b1", "completed")],
    ["assignBuildToProject", () => assignBuildToProject("b1", "p1")],
    ["getBuildMetrics", () => getBuildMetrics()],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Builds Actions — searchBuilds", () => {
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
      if (table === "builds") return makeSearchChain([makeBaseBuildRow()], 1);
      return {};
    });

    const result = await searchBuilds({ status: "completed", source: "manual", projectId: "p1", limit: 10, offset: 5 });

    expect(result.builds).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.builds[0]).toMatchObject({
      id: "b1",
      projectId: "p1",
      projectName: "Project A",
      releaseName: "Release 1",
      status: "completed",
      source: "manual",
    });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeSearchChain([], null, { message: "boom" });
      return {};
    });

    await expect(searchBuilds()).rejects.toThrow("Failed to fetch builds: boom");
  });
});

describe("Builds Actions — getBuildById", () => {
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

  it("returns mapped build when found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeByIdChain(makeBaseBuildRow());
      return {};
    });

    const result = await getBuildById("b1");

    expect(result).toMatchObject({ id: "b1", name: "Build 1" });
  });

  it("returns null when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeByIdChain(null);
      return {};
    });

    const result = await getBuildById("missing");
    expect(result).toBeNull();
  });
});

describe("Builds Actions — updateBuildStatus", () => {
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
      if (table === "builds") return makeUpdateChain(null);
      return {};
    });

    await updateBuildStatus("b1", "failed");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "build.update_status",
      targetType: "build",
      targetId: "b1",
      metadata: { status: "failed" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeUpdateChain({ message: "boom" });
      return {};
    });

    await expect(updateBuildStatus("b1", "completed")).rejects.toThrow("Failed to update build: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("rejects invalid input before any Supabase call", async () => {
    await expect(updateBuildStatus("", "completed")).rejects.toThrow("Invalid input");
    await expect(updateBuildStatus("b1", "invalid" as "completed")).rejects.toThrow("Invalid input");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Builds Actions — assignBuildToProject", () => {
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

  it("assigns and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeUpdateChain(null);
      return {};
    });

    await assignBuildToProject("b1", "p2");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "build.assign",
      targetType: "build",
      targetId: "b1",
      metadata: { projectId: "p2" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeUpdateChain({ message: "boom" });
      return {};
    });

    await expect(assignBuildToProject("b1", "p2")).rejects.toThrow("Failed to assign build: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("rejects invalid input before any Supabase call", async () => {
    await expect(assignBuildToProject("", "p2")).rejects.toThrow("Invalid input");
    await expect(assignBuildToProject("b1", "")).rejects.toThrow("Invalid input");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Builds Actions — getBuildMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeMetricsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => Promise.resolve({ data: rows, error })),
    };
  }

  it("returns tallies and avg duration from fixtures", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") {
        return makeMetricsChain([
          { status: "planned", start_date: null, end_date: null, source: "manual", cicd_provider: null },
          { status: "running", start_date: null, end_date: null, source: "api", cicd_provider: "github" },
          { status: "completed", start_date: "2024-06-01T10:00:00Z", end_date: "2024-06-01T11:00:00Z", source: "cli", cicd_provider: "github" },
          { status: "failed", start_date: "2024-06-01T10:00:00Z", end_date: "2024-06-01T10:30:00Z", source: "api", cicd_provider: "gitlab" },
          { status: "cancelled", start_date: null, end_date: null, source: "bitbucket_webhook", cicd_provider: null },
        ]);
      }
      return {};
    });

    const result = await getBuildMetrics();

    expect(result.total).toBe(5);
    expect(result.planned).toBe(1);
    expect(result.running).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.cancelled).toBe(1);
    expect(result.avgDurationMs).toBe(2700000); // (3600000 + 1800000) / 2
    expect(result.bySource).toEqual({ manual: 1, api: 2, cli: 1, bitbucket_webhook: 1 });
    expect(result.byProvider).toEqual({ github: 2, gitlab: 1 });
  });

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "builds") return makeMetricsChain([], { message: "boom" });
      return {};
    });

    await expect(getBuildMetrics()).rejects.toThrow("Failed to fetch build metrics: boom");
  });
});
