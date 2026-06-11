import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchApiKeys, updateApiKeyQuota, revokeApiKey } from "../api-keys";
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

describe("API Keys Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("searchApiKeys rejects before Supabase call", async () => {
    await expect(searchApiKeys()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("updateApiKeyQuota rejects before Supabase call", async () => {
    await expect(updateApiKeyQuota("key_1", 5000)).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("revokeApiKey rejects before Supabase call", async () => {
    await expect(revokeApiKey("key_1")).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("API Keys Actions — reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  describe("searchApiKeys", () => {
    it("maps keys and applies org/project filters", async () => {
      const resultPromise = Promise.resolve({
        data: [
          {
            id: "key_1",
            org_id: "org_1",
            project_id: "proj_1",
            name: "Production",
            key_hash: "hash",
            key_prefix: "pk_",
            scopes: ["read", "write"],
            rate_limit_per_minute: 100,
            monthly_quota_override: 10000,
            monthly_usage: 500,
            last_used_at: "2024-06-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            created_by: "user_1",
            expires_at: null,
            revoked_at: null,
            organizations: { name: "Acme" },
          },
        ],
        error: null,
        count: 1,
      });
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
        order: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        then: resultPromise.then.bind(resultPromise) as Promise<unknown>["then"],
      };
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") {
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => chainable),
              })),
            })),
          };
        }
        return {};
      });

      const result = await searchApiKeys({ orgId: "org_1", projectId: "proj_1", limit: 10, offset: 0 });

      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toMatchObject({
        id: "key_1",
        orgId: "org_1",
        projectId: "proj_1",
        name: "Production",
        scopes: ["read", "write"],
        rateLimitPerMinute: 100,
        monthlyQuotaOverride: 10000,
        monthlyUsage: 500,
      });
      expect(result.total).toBe(1);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Supabase error", async () => {
      const resultPromise = Promise.resolve({ data: null, error: { message: "boom" }, count: null });
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
        order: vi.fn(function (this: typeof chainable) {
          return this;
        }),
        then: resultPromise.then.bind(resultPromise) as Promise<unknown>["then"],
      };
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") {
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => chainable),
              })),
            })),
          };
        }
        return {};
      });
      await expect(searchApiKeys()).rejects.toThrow("Failed to fetch API keys: boom");
    });
  });
});

describe("API Keys Actions — writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeApiKeysMock() {
    const eqUpdateMock = vi.fn<() => Promise<{ error: unknown }>>(() => Promise.resolve({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
    const singleMock = vi.fn(() =>
      Promise.resolve({ data: { name: "Production", org_id: "org_1" }, error: null })
    );
    const eqSelectMock = vi.fn(() => ({ single: singleMock }));
    const selectMock = vi.fn(() => ({ eq: eqSelectMock }));

    let callIndex = 0;
    const fromMock = {
      select: vi.fn(() => {
        callIndex++;
        return callIndex === 1 ? { eq: eqSelectMock } : { eq: eqUpdateMock };
      }),
      update: updateMock,
    };
    return { fromMock, selectMock, eqSelectMock, singleMock, updateMock, eqUpdateMock };
  }

  describe("updateApiKeyQuota", () => {
    it("updates monthly_quota_override and logs audit", async () => {
      const { fromMock, eqUpdateMock } = makeApiKeysMock();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") return fromMock;
        return {};
      });

      await updateApiKeyQuota("key_1", 9999);

      expect(fromMock.select).toHaveBeenCalledWith("name, org_id");
      expect(fromMock.update).toHaveBeenCalledWith({ monthly_quota_override: 9999 });
      expect(eqUpdateMock).toHaveBeenCalledWith("id", "key_1");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "api_key.quota_update",
        targetType: "api_key",
        targetId: "key_1",
        targetName: "Production",
        metadata: { orgId: "org_1", monthlyQuotaOverride: 9999 },
      });
    });

    it("throws on Supabase error", async () => {
      const { fromMock, eqUpdateMock } = makeApiKeysMock();
      eqUpdateMock.mockResolvedValue({ error: { message: "boom" } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") return fromMock;
        return {};
      });
      await expect(updateApiKeyQuota("key_1", 1000)).rejects.toThrow("Failed to update API key quota: boom");
    });
  });

  describe("revokeApiKey", () => {
    it("sets revoked_at to ISO string and logs audit", async () => {
      const { fromMock, eqUpdateMock } = makeApiKeysMock();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") return fromMock;
        return {};
      });

      await revokeApiKey("key_1");

      expect(fromMock.update).toHaveBeenCalledWith({ revoked_at: "2024-06-15T12:00:00.000Z" });
      expect(eqUpdateMock).toHaveBeenCalledWith("id", "key_1");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "api_key.revoke",
        targetType: "api_key",
        targetId: "key_1",
        targetName: "Production",
        metadata: { orgId: "org_1" },
      });
    });

    it("throws on Supabase error", async () => {
      const { fromMock, eqUpdateMock } = makeApiKeysMock();
      eqUpdateMock.mockResolvedValue({ error: { message: "boom" } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "api_keys") return fromMock;
        return {};
      });
      await expect(revokeApiKey("key_1")).rejects.toThrow("Failed to revoke API key: boom");
    });
  });
});
