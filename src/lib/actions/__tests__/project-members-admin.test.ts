import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProjectMembersWithRoles,
  updateProjectMemberCustomRole,
  removeProjectMember,
} from "../project-members-admin";
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

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    clerk_user_id: "u1",
    email: "a@example.com",
    display_name: "Ada",
    custom_role_id: "r1",
    assigned_via_group_id: null,
    joined_at: "2024-01-01T00:00:00Z",
    custom_roles: { name: "Admin" },
    user_groups: null,
    ...overrides,
  };
}

function makeListChain(rows: unknown[], error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: rows, error })),
      })),
    })),
  };
}

function makeSelectMemberChain(row: unknown | null, error: unknown = null) {
  const inner = {
    single: vi.fn(() => Promise.resolve({ data: row, error })),
  };
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => inner),
      })),
    })),
  };
}

function makeUpdateChain(error: unknown = null) {
  const result = { error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return {
    update: vi.fn(() => inner),
  };
}

function makeDeleteChain(error: unknown = null) {
  const result = { error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return {
    delete: vi.fn(() => inner),
  };
}

describe("Project Members Admin — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["getProjectMembersWithRoles", () => getProjectMembersWithRoles("p1")],
    ["updateProjectMemberCustomRole", () => updateProjectMemberCustomRole("p1", "u1", "r2")],
    ["removeProjectMember", () => removeProjectMember("p1", "u1")],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Project Members Admin — getProjectMembersWithRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps members with custom role and group names", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return makeListChain([
          makeMemberRow(),
          makeMemberRow({
            clerk_user_id: "u2",
            email: "b@example.com",
            display_name: "Bob",
            custom_role_id: null,
            assigned_via_group_id: "g1",
            custom_roles: null,
            user_groups: { name: "Engineering" },
          }),
        ]);
      }
      return {};
    });

    const result = await getProjectMembersWithRoles("p1");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "u1",
      email: "a@example.com",
      name: "Ada",
      role: "Admin",
      customRoleId: "r1",
      customRoleName: "Admin",
      assignedViaGroupId: null,
      assignedViaGroupName: null,
    });
    expect(result[1]).toMatchObject({
      id: "u2",
      role: "member",
      customRoleId: null,
      customRoleName: null,
      assignedViaGroupId: "g1",
      assignedViaGroupName: "Engineering",
    });
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") return makeListChain([], { message: "boom" });
      return {};
    });

    await expect(getProjectMembersWithRoles("p1")).rejects.toThrow("Failed to fetch project members: boom");
  });
});

describe("Project Members Admin — updateProjectMemberCustomRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("updates role and logs action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { email: "a@example.com", display_name: "Ada" }, error: null })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await updateProjectMemberCustomRole("p1", "u1", "r2");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "project_member.role_update",
      targetType: "project_member",
      targetId: "u1",
      targetName: "Ada",
      metadata: { projectId: "p1", customRoleId: "r2" },
    });
  });

  it("throws when member not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return makeSelectMemberChain(null);
      }
      return {};
    });

    await expect(updateProjectMemberCustomRole("p1", "u1", "r2")).rejects.toThrow("Project member not found");
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { email: "a@example.com", display_name: "Ada" }, error: null })),
              })),
            })),
          })),
          update: makeUpdateChain({ message: "boom" }).update,
        };
      }
      return {};
    });

    await expect(updateProjectMemberCustomRole("p1", "u1", "r2")).rejects.toThrow("Failed to update member role: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Project Members Admin — removeProjectMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("removes member and logs action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { email: "a@example.com", display_name: "Ada" }, error: null })),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await removeProjectMember("p1", "u1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "project_member.remove",
      targetType: "project_member",
      targetId: "u1",
      targetName: "Ada",
      metadata: { projectId: "p1" },
    });
  });

  it("throws when member not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") return makeSelectMemberChain(null);
      return {};
    });

    await expect(removeProjectMember("p1", "u1")).rejects.toThrow("Project member not found");
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { email: "a@example.com", display_name: "Ada" }, error: null })),
              })),
            })),
          })),
          delete: makeDeleteChain({ message: "boom" }).delete,
        };
      }
      return {};
    });

    await expect(removeProjectMember("p1", "u1")).rejects.toThrow("Failed to remove project member: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
