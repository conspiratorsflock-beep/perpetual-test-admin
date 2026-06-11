import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPermissionsCatalog,
  getCustomRoles,
  getCustomRole,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "../custom-roles";
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

function makeBaseRoleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    org_id: "o1",
    name: "Admin",
    description: "Full access",
    template_role: null,
    is_system: false,
    system_role_key: null,
    created_by: "u1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeOrderChain(rows: unknown[], error: unknown = null) {
  const result = { data: rows, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    order: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return {
    select: vi.fn(() => inner),
  };
}

function makeEqOrderChain(rows: unknown[], error: unknown = null) {
  const result = { data: rows, error };
  const inner: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(() => inner),
    order: vi.fn(() => inner),
    then: vi.fn((resolve: unknown) =>
      Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
    ),
  };
  return {
    select: vi.fn(() => inner),
  };
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

describe("Custom Roles — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["getPermissionsCatalog", () => getPermissionsCatalog()],
    ["getCustomRoles", () => getCustomRoles("o1")],
    ["getCustomRole", () => getCustomRole("r1")],
    ["createCustomRole", () => createCustomRole("o1", "Name", null, [])],
    ["updateCustomRole", () => updateCustomRole("r1", { name: "X" })],
    ["deleteCustomRole", () => deleteCustomRole("r1")],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Custom Roles — getPermissionsCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps permissions and orders", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "permissions") {
        return makeOrderChain([
          { id: "p1", resource: "org", action: "read", level: "org", description: "Read org", is_restricted: false },
        ]);
      }
      return {};
    });

    const result = await getPermissionsCatalog();
    expect(result).toEqual([
      { id: "p1", resource: "org", action: "read", level: "org", description: "Read org", isRestricted: false },
    ]);
  });

  it("throws on query failure", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "permissions") return makeOrderChain([], { message: "boom" });
      return {};
    });

    await expect(getPermissionsCatalog()).rejects.toThrow("Failed to fetch permissions catalog: boom");
  });
});

describe("Custom Roles — getCustomRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns mapped roles for raw org id", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeEqOrderChain([makeBaseRoleRow()]);
      return {};
    });

    const result = await getCustomRoles("o1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "r1", orgId: "o1", name: "Admin", isSystem: false });
  });

  it("resolves clerk org id via organizations lookup", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeSingleChain({ id: "db-o1" });
      if (table === "custom_roles") return makeEqOrderChain([makeBaseRoleRow({ org_id: "db-o1" })]);
      return {};
    });

    const result = await getCustomRoles("org_clerk_123");
    expect(result[0].orgId).toBe("db-o1");
  });

  it("throws when organization not found for clerk id", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeSingleChain(null);
      return {};
    });

    await expect(getCustomRoles("org_clerk_123")).rejects.toThrow("Organization not found");
  });
});

describe("Custom Roles — getCustomRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps role with permission ids", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return makeSingleChain({
          ...makeBaseRoleRow(),
          role_permissions: [{ permission_id: "p1" }, { permission_id: "p2" }],
        });
      }
      return {};
    });

    const result = await getCustomRole("r1");
    expect(result.permissionIds).toEqual(["p1", "p2"]);
  });

  it("throws when not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain(null);
      return {};
    });

    await expect(getCustomRole("missing")).rejects.toThrow("Failed to fetch custom role:");
  });
});

describe("Custom Roles — createCustomRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("rejects invalid input before DB call", async () => {
    await expect(createCustomRole("", "Admin", null, [])).rejects.toThrow("Invalid input:");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("creates role without permissions and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeInsertChain(makeBaseRoleRow());
      return {};
    });

    const result = await createCustomRole("o1", "Admin", "desc", []);

    expect(result).toMatchObject({ id: "r1", name: "Admin" });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "custom_role.create",
      targetType: "custom_role",
      targetId: "r1",
      targetName: "Admin",
      metadata: { orgId: "o1", permissionCount: 0 },
    });
  });

  it("creates role with permissions and logs", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeInsertChain(makeBaseRoleRow());
      if (table === "role_permissions") {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      return {};
    });

    const result = await createCustomRole("o1", "Admin", "desc", ["p1", "p2"]);

    expect(result.permissionIds).toEqual(["p1", "p2"]);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { orgId: "o1", permissionCount: 2 } })
    );
  });

  it("cleans up role if permission assignment fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return {
          ...makeInsertChain(makeBaseRoleRow()),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      if (table === "role_permissions") {
        return {
          insert: vi.fn(() => Promise.resolve({ error: { message: "perm boom" } })),
        };
      }
      return {};
    });

    await expect(createCustomRole("o1", "Admin", "desc", ["p1"])).rejects.toThrow("Failed to assign permissions: perm boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Custom Roles — updateCustomRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("rejects invalid input before DB call", async () => {
    await expect(updateCustomRole("", { name: "X" })).rejects.toThrow("Invalid input:");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws when role not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain(null);
      return {};
    });

    await expect(updateCustomRole("r1", { name: "X" })).rejects.toThrow("Custom role not found");
  });

  it("throws when modifying system role", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain({ name: "System", is_system: true });
      return {};
    });

    await expect(updateCustomRole("r1", { name: "X" })).rejects.toThrow("Cannot modify system roles");
  });

  it("updates name only when no permissions provided", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Old", is_system: false }, error: null })),
            })),
          })),
          update: makeUpdateChain(null).update,
        };
      }
      return {};
    });

    await updateCustomRole("r1", { name: "New" });

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "custom_role.update",
      targetType: "custom_role",
      targetId: "r1",
      targetName: "Old",
      metadata: { changedFields: ["name"], permissionCount: undefined },
    });
  });

  it("replaces permissions and logs permission count", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Old", is_system: false }, error: null })),
            })),
          })),
          update: makeUpdateChain(null).update,
        };
      }
      if (table === "role_permissions") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      return {};
    });

    await updateCustomRole("r1", { permissionIds: ["p3"] });

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { changedFields: ["permissionIds"], permissionCount: 1 } })
    );
  });

  it("throws on update error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Old", is_system: false }, error: null })),
            })),
          })),
          update: makeUpdateChain({ message: "boom" }).update,
        };
      }
      return {};
    });

    await expect(updateCustomRole("r1", { name: "New" })).rejects.toThrow("Failed to update custom role: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Custom Roles — deleteCustomRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("rejects invalid input before DB call", async () => {
    await expect(deleteCustomRole("")).rejects.toThrow("Invalid input:");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws when role not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain(null);
      return {};
    });

    await expect(deleteCustomRole("r1")).rejects.toThrow("Custom role not found");
  });

  it("throws when deleting system role", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain({ name: "System", is_system: true });
      return {};
    });

    await expect(deleteCustomRole("r1")).rejects.toThrow("Cannot delete system roles");
  });

  it("throws when role is assigned to project members", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") return makeSingleChain({ name: "Admin", is_system: false });
      if (table === "project_members") return makeCountChain(3);
      return {};
    });

    await expect(deleteCustomRole("r1")).rejects.toThrow("Cannot delete role: assigned to 3 project member(s)");
  });

  it("deletes role and logs when not in use", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "custom_roles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: "Admin", is_system: false }, error: null })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      if (table === "project_members") return makeCountChain(0);
      return {};
    });

    await deleteCustomRole("r1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "custom_role.delete",
      targetType: "custom_role",
      targetId: "r1",
      targetName: "Admin",
    });
  });
});
