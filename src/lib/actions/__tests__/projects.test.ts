import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchProjects,
  getProjectById,
  toggleRequirementsEnabled,
  softDeleteProject,
  restoreProject,
  getProjectMembers,
} from "../projects";
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

function makeHeadCountPromise(count: number | null = 0) {
  const p = Promise.resolve({ data: null, error: null, count }) as Promise<{
    data: null;
    error: null;
    count: number | null;
  }> & { is: ReturnType<typeof vi.fn> };
  p.is = vi.fn(() => Promise.resolve({ data: null, error: null, count }));
  return p;
}

function makeSelectCountChain(count: number | null = 0) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => makeHeadCountPromise(count)),
    })),
  };
}

function makeSimpleUpdateMock() {
  const eqMock = vi.fn(() => Promise.resolve({ error: null }));
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  return { update: updateMock, eq: eqMock };
}

describe("Projects Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("searchProjects rejects before Supabase call", async () => {
    await expect(searchProjects()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getProjectById rejects before Supabase call", async () => {
    await expect(getProjectById("proj_1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("toggleRequirementsEnabled rejects before Supabase call", async () => {
    await expect(toggleRequirementsEnabled("proj_1", true)).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("softDeleteProject rejects before Supabase call", async () => {
    await expect(softDeleteProject("proj_1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("restoreProject rejects before Supabase call", async () => {
    await expect(restoreProject("proj_1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getProjectMembers rejects before Supabase call", async () => {
    await expect(getProjectMembers("proj_1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Projects Actions — reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  describe("searchProjects", () => {
    function makeSearchChain(result: { data: unknown; error: unknown; count: number | null }) {
      const resultPromise = Promise.resolve(result);
      const chainable = {
        range: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        is: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        eq: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        ilike: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        then: ((...args: unknown[]) => resultPromise.then(...args)) as typeof resultPromise.then,
      };
      return chainable;
    }

    it("maps projects with counts and filters", async () => {
      const chainable = makeSearchChain({
        data: [
          {
            id: "proj_1",
            name: "Alpha",
            description: "desc",
            project_code: "ALP",
            jira_project_key: "ALP",
            jira_site_url: "https://jira",
            bitbucket_repo_url: "https://bb",
            requirements_enabled: true,
            org_id: "org_1",
            deleted_at: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            organizations: { name: "Acme" },
            project_members: [{ count: 3 }],
            test_cases: [{ count: 10 }],
            test_runs: [{ count: 2 }],
          },
        ],
        error: null,
        count: 1,
      });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => chainable),
            })),
          };
        }
        return {};
      });

      const result = await searchProjects({ query: "Alp", orgId: "org_1", includeDeleted: false, limit: 10, offset: 0 });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toMatchObject({
        id: "proj_1",
        name: "Alpha",
        projectCode: "ALP",
        requirementsEnabled: true,
        orgName: "Acme",
        memberCount: 3,
        testCaseCount: 10,
        testRunCount: 2,
        releaseCount: 0,
      });
      expect(result.total).toBe(1);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Supabase error", async () => {
      const chainable = makeSearchChain({ data: null, error: { message: "boom" }, count: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => chainable),
            })),
          };
        }
        return {};
      });
      await expect(searchProjects()).rejects.toThrow("Failed to fetch projects: boom");
    });
  });

  describe("getProjectById", () => {
    it("returns mapped project with aggregated counts", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: "proj_1",
                      name: "Alpha",
                      description: null,
                      project_code: null,
                      jira_project_key: null,
                      jira_site_url: null,
                      bitbucket_repo_url: null,
                      requirements_enabled: false,
                      org_id: "org_1",
                      deleted_at: null,
                      created_at: "2024-01-01T00:00:00Z",
                      updated_at: "2024-01-01T00:00:00Z",
                      organizations: { name: "Acme" },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        if (table === "project_members" || table === "test_cases" || table === "test_runs" || table === "releases") {
          return makeSelectCountChain(5);
        }
        return {};
      });

      const result = await getProjectById("proj_1");

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: "proj_1",
        orgName: "Acme",
        memberCount: 5,
        testCaseCount: 5,
        testRunCount: 5,
        releaseCount: 5,
      });
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("returns null when project not found", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } })),
              })),
            })),
          };
        }
        return {};
      });

      const result = await getProjectById("missing");
      expect(result).toBeNull();
    });
  });

  describe("getProjectMembers", () => {
    it("maps members with custom role name fallback", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "project_members") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: [
                      {
                        clerk_user_id: "user_1",
                        email: "a@example.com",
                        display_name: "Alice",
                        custom_roles: { name: "lead" },
                        joined_at: "2024-01-01T00:00:00Z",
                      },
                      {
                        clerk_user_id: "user_2",
                        email: "b@example.com",
                        display_name: null,
                        custom_roles: null,
                        joined_at: "2024-01-02T00:00:00Z",
                      },
                    ],
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {};
      });

      const result = await getProjectMembers("proj_1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "user_1", email: "a@example.com", name: "Alice", role: "lead" });
      expect(result[1]).toMatchObject({ id: "user_2", role: "member" });
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Supabase error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "project_members") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } })),
              })),
            })),
          };
        }
        return {};
      });
      await expect(getProjectMembers("proj_1")).rejects.toThrow("Failed to fetch project members: boom");
    });
  });
});

describe("Projects Actions — writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("toggleRequirementsEnabled", () => {
    it("updates requirements_enabled and logs audit", async () => {
      const projectsMock = makeSimpleUpdateMock();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });

      await toggleRequirementsEnabled("proj_1", true);

      expect(projectsMock.update).toHaveBeenCalledWith({ requirements_enabled: true });
      expect(projectsMock.eq).toHaveBeenCalledWith("id", "proj_1");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "project.toggle_requirements",
        targetType: "project",
        targetId: "proj_1",
        metadata: { enabled: true },
      });
    });

    it("throws on Supabase error", async () => {
      const projectsMock = makeSimpleUpdateMock();
      projectsMock.eq.mockResolvedValue({ error: { message: "boom" } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });
      await expect(toggleRequirementsEnabled("proj_1", false)).rejects.toThrow("Failed to update project: boom");
    });
  });

  describe("softDeleteProject", () => {
    it("sets deleted_at to ISO string and logs audit", async () => {
      const projectsMock = makeSimpleUpdateMock();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });

      await softDeleteProject("proj_1");

      expect(projectsMock.update).toHaveBeenCalledWith({ deleted_at: "2024-06-15T12:00:00.000Z" });
      expect(projectsMock.eq).toHaveBeenCalledWith("id", "proj_1");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "project.soft_delete",
        targetType: "project",
        targetId: "proj_1",
      });
    });

    it("throws on Supabase error", async () => {
      const projectsMock = makeSimpleUpdateMock();
      projectsMock.eq.mockResolvedValue({ error: { message: "boom" } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });
      await expect(softDeleteProject("proj_1")).rejects.toThrow("Failed to delete project: boom");
    });
  });

  describe("restoreProject", () => {
    it("clears deleted_at and logs audit", async () => {
      const projectsMock = makeSimpleUpdateMock();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });

      await restoreProject("proj_1");

      expect(projectsMock.update).toHaveBeenCalledWith({ deleted_at: null });
      expect(projectsMock.eq).toHaveBeenCalledWith("id", "proj_1");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "project.restore",
        targetType: "project",
        targetId: "proj_1",
      });
    });

    it("throws on Supabase error", async () => {
      const projectsMock = makeSimpleUpdateMock();
      projectsMock.eq.mockResolvedValue({ error: { message: "boom" } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "projects") return projectsMock;
        return {};
      });
      await expect(restoreProject("proj_1")).rejects.toThrow("Failed to restore project: boom");
    });
  });
});
