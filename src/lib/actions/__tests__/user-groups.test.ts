import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserGroups,
  getUserGroup,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  getGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
  getProjectGroups,
  assignGroupToProject,
  removeGroupFromProject,
} from "../user-groups";
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

function makeBaseGroupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    org_id: "o1",
    name: "Engineering",
    description: "Dev team",
    created_by: "u1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeOrgResolveChain(dbOrgId: string | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: dbOrgId ? { id: dbOrgId } : null, error: null })),
      })),
    })),
  };
}

function makeOrderEqChain(rows: unknown[], error: unknown = null) {
  const result = { data: rows, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    order: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return { select: vi.fn(() => inner) };
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

function makeInsertChain(row: unknown | null, error: unknown = null) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: row, error })),
      })),
    })),
  };
}

function makeUpdateChain(error: unknown = null) {
  return {
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error })),
    })),
  };
}

function makeDeleteChain(error: unknown = null) {
  return {
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error })),
    })),
  };
}

function makeCountChain(count: number | null, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ count, error })),
    })),
  };
}

describe("User Groups — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["getUserGroups", () => getUserGroups("o1")],
    ["getUserGroup", () => getUserGroup("g1")],
    ["createUserGroup", () => createUserGroup("o1", "Name")],
    ["updateUserGroup", () => updateUserGroup("g1", { name: "X" })],
    ["deleteUserGroup", () => deleteUserGroup("g1")],
    ["getGroupMembers", () => getGroupMembers("g1")],
    ["addUserToGroup", () => addUserToGroup("g1", "u1")],
    ["removeUserFromGroup", () => removeUserFromGroup("g1", "u1")],
    ["getProjectGroups", () => getProjectGroups("p1")],
    ["assignGroupToProject", () => assignGroupToProject("p1", "g1", "r1")],
    ["removeGroupFromProject", () => removeGroupFromProject("p1", "g1")],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("User Groups — getUserGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps groups with member and project counts for raw org id", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") {
        return makeOrderEqChain([
          {
            ...makeBaseGroupRow(),
            group_memberships: [{ count: 3 }],
            project_group_access: [{ count: 2 }],
          },
        ]);
      }
      return {};
    });

    const result = await getUserGroups("o1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "g1", orgId: "o1", memberCount: 3, projectCount: 2 });
  });

  it("resolves clerk org id and maps groups", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeOrgResolveChain("db-o1");
      if (table === "user_groups") {
        return makeOrderEqChain([makeBaseGroupRow({ org_id: "db-o1" })]);
      }
      return {};
    });

    const result = await getUserGroups("org_clerk");
    expect(result[0].orgId).toBe("db-o1");
  });

  it("throws when organization lookup fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeOrgResolveChain(null);
      return {};
    });

    await expect(getUserGroups("org_clerk")).rejects.toThrow("Organization not found");
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeOrderEqChain([], { message: "boom" });
      return {};
    });

    await expect(getUserGroups("o1")).rejects.toThrow("Failed to fetch user groups: boom");
  });
});

describe("User Groups — getUserGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns mapped group", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain(makeBaseGroupRow());
      return {};
    });

    const result = await getUserGroup("g1");
    expect(result).toMatchObject({ id: "g1", name: "Engineering" });
  });

  it("throws when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain(null);
      return {};
    });

    await expect(getUserGroup("missing")).rejects.toThrow("Failed to fetch user group:");
  });
});

describe("User Groups — createUserGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("creates and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeInsertChain(makeBaseGroupRow());
      return {};
    });

    const result = await createUserGroup("o1", "Engineering", "Dev team");
    expect(result).toMatchObject({ id: "g1", name: "Engineering" });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user_group.create",
      targetType: "user_group",
      targetId: "g1",
      targetName: "Engineering",
      metadata: { orgId: "o1" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeInsertChain(null, { message: "boom" });
      return {};
    });

    await expect(createUserGroup("o1", "Engineering")).rejects.toThrow("Failed to create user group: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("User Groups — updateUserGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("throws when group not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain(null);
      return {};
    });

    await expect(updateUserGroup("g1", { name: "X" })).rejects.toThrow("User group not found");
  });

  it("updates only provided fields and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Old" }, error: null })),
            })),
          })),
          update: makeUpdateChain(null).update,
        };
      }
      return {};
    });

    await updateUserGroup("g1", { name: "New", description: null });

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user_group.update",
      targetType: "user_group",
      targetId: "g1",
      targetName: "Old",
      metadata: { changedFields: ["name", "description"] },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Old" }, error: null })),
            })),
          })),
          update: makeUpdateChain({ message: "boom" }).update,
        };
      }
      return {};
    });

    await expect(updateUserGroup("g1", { name: "New" })).rejects.toThrow("Failed to update user group: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("User Groups — deleteUserGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("throws when group not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain(null);
      return {};
    });

    await expect(deleteUserGroup("g1")).rejects.toThrow("User group not found");
  });

  it("throws when group has members", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "G" });
      if (table === "group_memberships") return makeCountChain(2);
      if (table === "project_group_access") return makeCountChain(0);
      return {};
    });

    await expect(deleteUserGroup("g1")).rejects.toThrow("Cannot delete group: has 2 member(s)");
  });

  it("throws when group is assigned to projects", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "G" });
      if (table === "group_memberships") return makeCountChain(0);
      if (table === "project_group_access") return makeCountChain(1);
      return {};
    });

    await expect(deleteUserGroup("g1")).rejects.toThrow("Cannot delete group: assigned to 1 project(s)");
  });

  it("deletes and logs when empty", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "G" }, error: null })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      if (table === "group_memberships") return makeCountChain(0);
      if (table === "project_group_access") return makeCountChain(0);
      return {};
    });

    await deleteUserGroup("g1");
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user_group.delete",
      targetType: "user_group",
      targetId: "g1",
      targetName: "G",
    });
  });
});

describe("User Groups — getGroupMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps members with user info", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "group_memberships") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  { group_id: "g1", clerk_user_id: "u1", joined_at: "2024-01-01T00:00:00Z", users: { email: "a@example.com", display_name: "Ada" } },
                ],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    const result = await getGroupMembers("g1");
    expect(result).toEqual([
      { groupId: "g1", clerkUserId: "u1", joinedAt: "2024-01-01T00:00:00Z", userEmail: "a@example.com", userName: "Ada" },
    ]);
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "group_memberships") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: { message: "boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(getGroupMembers("g1")).rejects.toThrow("Failed to fetch group members: boom");
  });
});

describe("User Groups — addUserToGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("inserts membership and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering", org_id: "o1" });
      if (table === "group_memberships") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await addUserToGroup("g1", "u1");
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user_group.member_add",
      targetType: "user_group",
      targetId: "g1",
      targetName: "Engineering",
      metadata: { clerkUserId: "u1", orgId: "o1" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering", org_id: "o1" });
      if (table === "group_memberships") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(addUserToGroup("g1", "u1")).rejects.toThrow("Failed to add user to group: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("User Groups — removeUserFromGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("deletes membership and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering", org_id: "o1" });
      if (table === "group_memberships") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await removeUserFromGroup("g1", "u1");
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user_group.member_remove",
      targetType: "user_group",
      targetId: "g1",
      targetName: "Engineering",
      metadata: { clerkUserId: "u1", orgId: "o1" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering", org_id: "o1" });
      if (table === "group_memberships") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: "boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(removeUserFromGroup("g1", "u1")).rejects.toThrow("Failed to remove user from group: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("User Groups — getProjectGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps project group access with names", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "project_group_access") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: "a1",
                    project_id: "p1",
                    group_id: "g1",
                    role_id: "r1",
                    assigned_by: "u1",
                    assigned_at: "2024-02-01T00:00:00Z",
                    user_groups: { name: "Engineering" },
                    custom_roles: { name: "Admin" },
                  },
                ],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    const result = await getProjectGroups("p1");
    expect(result).toEqual([
      {
        id: "a1",
        projectId: "p1",
        groupId: "g1",
        roleId: "r1",
        assignedBy: "u1",
        assignedAt: "2024-02-01T00:00:00Z",
        groupName: "Engineering",
        roleName: "Admin",
      },
    ]);
  });
});

describe("User Groups — assignGroupToProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("inserts access and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering" });
      if (table === "custom_roles") return makeSingleChain({ name: "Admin" });
      if (table === "project_group_access") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await assignGroupToProject("p1", "g1", "r1");
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "project_group_access.assign",
      targetType: "project_group_access",
      targetId: "p1",
      metadata: { groupId: "g1", groupName: "Engineering", roleId: "r1", roleName: "Admin" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering" });
      if (table === "custom_roles") return makeSingleChain({ name: "Admin" });
      if (table === "project_group_access") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(assignGroupToProject("p1", "g1", "r1")).rejects.toThrow("Failed to assign group to project: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("User Groups — removeGroupFromProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("deletes access and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering" });
      if (table === "project_group_access") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await removeGroupFromProject("p1", "g1");
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "project_group_access.remove",
      targetType: "project_group_access",
      targetId: "p1",
      metadata: { groupId: "g1", groupName: "Engineering" },
    });
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "user_groups") return makeSingleChain({ name: "Engineering" });
      if (table === "project_group_access") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: "boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(removeGroupFromProject("p1", "g1")).rejects.toThrow("Failed to remove group from project: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
