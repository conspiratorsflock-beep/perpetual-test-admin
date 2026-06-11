import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTestEmailDomains,
  addTestEmailDomain,
  deactivateTestEmailDomain,
  reactivateTestEmailDomain,
} from "../test-email-domains";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";
import { auth } from "@/lib/dev-auth/server";

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

vi.mock("@/lib/dev-auth/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "admin_user_1" } as unknown as { userId: string })),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockLogAdminAction = vi.mocked(logAdminAction);
const mockAuth = vi.mocked(auth);

describe("Test Email Domains — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["listTestEmailDomains", () => listTestEmailDomains()],
    ["addTestEmailDomain", () => addTestEmailDomain("example.com")],
    ["deactivateTestEmailDomain", () => deactivateTestEmailDomain("dom_1")],
    ["reactivateTestEmailDomain", () => reactivateTestEmailDomain("dom_1")],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Test Email Domains — listTestEmailDomains", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeListChain(rows: unknown[], error: unknown = null) {
    let orderCalls = 0;
    const chain = {
      order: vi.fn(() => {
        orderCalls++;
        if (orderCalls === 2) return Promise.resolve({ data: rows, error });
        return chain;
      }),
    };
    return {
      select: vi.fn(() => chain),
    };
  }

  it("returns mapped domains sorted active-first then domain asc", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") {
        return makeListChain([
          {
            id: "d2",
            domain: "b.example.com",
            is_active: true,
            notes: null,
            created_by: "admin_1",
            created_at: "2024-06-01T10:00:00Z",
            deactivated_at: null,
            deactivated_by: null,
          },
          {
            id: "d1",
            domain: "a.example.com",
            is_active: false,
            notes: "old",
            created_by: "admin_1",
            created_at: "2024-05-01T10:00:00Z",
            deactivated_at: "2024-05-15T10:00:00Z",
            deactivated_by: "admin_1",
          },
        ]);
      }
      return {};
    });

    const result = await listTestEmailDomains();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "d2", domain: "b.example.com", isActive: true });
    expect(result[1]).toMatchObject({ id: "d1", domain: "a.example.com", isActive: false, notes: "old" });
  });

  it("returns empty array on DB error", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeListChain([], { message: "boom" });
      return {};
    });

    const result = await listTestEmailDomains();
    expect(result).toEqual([]);
  });
});

describe("Test Email Domains — addTestEmailDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    mockAuth.mockResolvedValue({ userId: "admin_user_1" } as never);
  });

  function makeAddChains(existing: { id: string; is_active: boolean } | null, updated: unknown | null, inserted: unknown | null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: existing, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: updated, error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: inserted, error: null })),
        })),
      })),
    };
  }

  it("inserts new domain and logs create action", async () => {
    const inserted = {
      id: "d_new",
      domain: "new.example.com",
      is_active: true,
      notes: "note",
      created_by: "admin_user_1",
      created_at: "2024-06-15T10:00:00Z",
      deactivated_at: null,
      deactivated_by: null,
    };
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeAddChains(null, null, inserted);
      return {};
    });

    const result = await addTestEmailDomain("new.example.com", "note");

    expect(result).toMatchObject({ id: "d_new", domain: "new.example.com", isActive: true });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_domain.create",
      targetType: "system",
      targetId: "d_new",
      targetName: "new.example.com",
      metadata: { notes: "note" },
    });
  });

  it("reactivates deactivated domain and logs reactivate action", async () => {
    const existing = { id: "d_old", is_active: false };
    const updated = {
      id: "d_old",
      domain: "old.example.com",
      is_active: true,
      notes: "reactivated note",
      created_by: "admin_1",
      created_at: "2024-05-01T10:00:00Z",
      deactivated_at: null,
      deactivated_by: null,
    };
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeAddChains(existing, updated, null);
      return {};
    });

    const result = await addTestEmailDomain("old.example.com", "reactivated note");

    expect(result).toMatchObject({ id: "d_old", domain: "old.example.com", isActive: true });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_domain.reactivate",
      targetType: "system",
      targetId: "d_old",
      targetName: "old.example.com",
      metadata: { notes: "reactivated note", reason: "re-added" },
    });
  });

  it("throws when domain already active", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeAddChains({ id: "d_active", is_active: true }, null, null);
      return {};
    });

    await expect(addTestEmailDomain("active.example.com")).rejects.toThrow("Domain already exists and is active");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on invalid domain", async () => {
    mockSupabaseFrom.mockImplementation(() => ({}));
    await expect(addTestEmailDomain("not a domain")).rejects.toThrow("Invalid domain format");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("throws on invalid input and does not call DB or log", async () => {
    await expect(addTestEmailDomain("")).rejects.toThrow("Invalid input");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on DB insert error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: "insert boom" } })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(addTestEmailDomain("new.example.com")).rejects.toThrow("insert boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Test Email Domains — deactivateTestEmailDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    mockAuth.mockResolvedValue({ userId: "admin_user_1" } as never);
  });

  function makeDeactivateChains(updateError: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { domain: "dom.example.com", is_active: true }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: updateError })),
      })),
    };
  }

  it("soft-deactivates and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeDeactivateChains(null);
      return {};
    });

    await deactivateTestEmailDomain("dom_1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_domain.deactivate",
      targetType: "system",
      targetId: "dom_1",
      targetName: "dom.example.com",
      metadata: { stopNewOnly: true },
    });
  });

  it("throws on invalid input and does not call DB or log", async () => {
    await expect(deactivateTestEmailDomain("")).rejects.toThrow("Invalid input");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws when domain not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(deactivateTestEmailDomain("dom_1")).rejects.toThrow("Domain not found");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeDeactivateChains({ message: "deactivate boom" });
      return {};
    });

    await expect(deactivateTestEmailDomain("dom_1")).rejects.toThrow("deactivate boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Test Email Domains — reactivateTestEmailDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeReactivateChains(updateError: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { domain: "dom.example.com" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: updateError })),
      })),
    };
  }

  it("reactivates and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeReactivateChains(null);
      return {};
    });

    await reactivateTestEmailDomain("dom_1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_domain.reactivate",
      targetType: "system",
      targetId: "dom_1",
      targetName: "dom.example.com",
      metadata: {},
    });
  });

  it("throws on invalid input and does not call DB or log", async () => {
    await expect(reactivateTestEmailDomain("")).rejects.toThrow("Invalid input");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws when domain not found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }
      return {};
    });

    await expect(reactivateTestEmailDomain("dom_1")).rejects.toThrow("Domain not found");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_domains") return makeReactivateChains({ message: "reactivate boom" });
      return {};
    });

    await expect(reactivateTestEmailDomain("dom_1")).rejects.toThrow("reactivate boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
