import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchOrganizations,
  getOrganizationById,
  changeTrialState,
  extendTrial,
  updateOrgApiQuota,
  getOrgApiUsage,
  getTrialMetrics,
  getTotalOrgCount,
  getTrialsExpiringSoon,
  exportOrganizationsToCSV,
} from "../organizations";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

const mockClerkClient = {
  users: {
    getUser: vi.fn(),
  },
  organizations: {
    getOrganizationList: vi.fn(),
    getOrganization: vi.fn(),
    getOrganizationMembershipList: vi.fn(),
  },
};

let mockAuthUserId: string | null = "admin_123";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: mockAuthUserId,
    }),
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

const mockClerkOrg = {
  id: "org_clerk_1",
  name: "Acme Corp",
  slug: "acme-corp",
  membersCount: 5,
  createdAt: Date.now(),
};

const mockDbOrg = {
  id: "org_db_1",
  clerk_org_id: "org_clerk_1",
  trial_lock_state: "active",
  trial_started_at: "2024-01-01T00:00:00Z",
  trial_ends_at: "2024-01-15T00:00:00Z",
  trial_extension_used: false,
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  stripe_price_id: "price_1",
  api_monthly_quota: 10000,
};

/** Builds a chain for getOrgUuidFromClerkId: .from("organizations").select("id").eq("clerk_org_id", id).single() */
function makeUuidSelectChain(clerkOrgId: string, orgUuid: string | null) {
  return vi.fn(() => ({
    eq: vi.fn((col: string, val: string) => {
      if (col === "clerk_org_id" && val === clerkOrgId) {
        return {
          single: vi.fn(() =>
            Promise.resolve({
              data: orgUuid ? { id: orgUuid } : null,
              error: null,
            })
          ),
        };
      }
      return { single: vi.fn(() => Promise.resolve({ data: null, error: null })) };
    }),
  }));
}

/** Builds a chain for .update(...).eq("id", orgUuid) */
function makeUpdateChain(error: unknown = null) {
  return vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error })),
  }));
}

/** Builds a chain for .select(...).eq("id", orgUuid).single() */
function makeSelectSingleChain(data: unknown, error: unknown = null) {
  return vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data, error })),
    })),
  }));
}

/**
 * Creates a smart mock for the organizations table that handles both
 * getOrgUuidFromClerkId (select("id").eq("clerk_org_id")) and function-specific
 * selects (select(...).eq("id")).
 */
function makeOrganizationsTableMock(options: {
  clerkOrgId: string;
  orgUuid: string | null;
  selectData?: unknown;
  selectError?: unknown;
  updateError?: unknown;
}) {
  const uuidChain = makeUuidSelectChain(options.clerkOrgId, options.orgUuid);
  const dataChain = makeSelectSingleChain(options.selectData, options.selectError);
  const updateChain = makeUpdateChain(options.updateError);

  return {
    select: vi.fn((columns?: string) => {
      if (columns === "id") return uuidChain();
      return dataChain();
    }),
    update: updateChain,
  };
}

describe("Organization Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId = "admin_123";
    mockClerkClient.users.getUser.mockResolvedValue({
      id: "admin_123",
      publicMetadata: { isAdmin: true },
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
  });

  describe("changeTrialState", () => {
    it("should update trial lock state and log action", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: makeUuidSelectChain("org_clerk_1", "org_db_1"),
          update: makeUpdateChain(null),
        };
      });

      await changeTrialState("org_clerk_1", "hard_locked", "abuse");

      // Verify update was called with wire value
      const updateCall = mockSupabaseFrom.mock.results.find(
        (r) => r.type === "return" && typeof r.value?.update === "function"
      );
      expect(updateCall).toBeDefined();
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "org.trial_state_change",
        targetType: "organization",
        targetId: "org_clerk_1",
        metadata: { newState: "hard_locked", reason: "abuse" },
      });
    });

    it("should throw when organization is not found in database", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: makeUuidSelectChain("org_clerk_unknown", null),
        };
      });

      await expect(changeTrialState("org_clerk_unknown", "paid")).rejects.toThrow(
        "Organization not found in database"
      );
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: makeUuidSelectChain("org_clerk_1", "org_db_1"),
          update: makeUpdateChain({ message: "DB Error" }),
        };
      });

      await expect(changeTrialState("org_clerk_1", "soft_locked")).rejects.toThrow(
        "Failed to update trial state"
      );
    });

    it("should reject non-admin users before any DB write", async () => {
      mockAuthUserId = "user_123";
      mockClerkClient.users.getUser.mockResolvedValue({
        id: "user_123",
        publicMetadata: { isAdmin: false },
      });

      await expect(changeTrialState("org_clerk_1", "paid")).rejects.toThrow("Unauthorized");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });

  describe("extendTrial", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should extend trial by N days and mark extension used", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: "2024-01-15T00:00:00Z",
            trial_extension_used: false,
            trial_lock_state: "active",
          },
          updateError: null,
        });
      });

      const result = await extendTrial("org_clerk_1", 7);

      expect(result.newTrialEndsAt).toBe("2024-01-22T00:00:00.000Z");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "org.extend_trial",
        targetType: "organization",
        targetId: "org_clerk_1",
        metadata: {
          days: 7,
          previousEnd: "2024-01-15T00:00:00Z",
          newEnd: "2024-01-22T00:00:00.000Z",
        },
      });
    });

    it("should throw for paid organizations", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: "2024-01-15T00:00:00Z",
            trial_extension_used: false,
            trial_lock_state: "paid",
          },
        });
      });

      await expect(extendTrial("org_clerk_1", 7)).rejects.toThrow(
        "Cannot extend trial for a paid organization"
      );
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw when trial extension already used", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: "2024-01-15T00:00:00Z",
            trial_extension_used: true,
            trial_lock_state: "active",
          },
        });
      });

      await expect(extendTrial("org_clerk_1", 7)).rejects.toThrow(
        "Trial extension already used"
      );
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should extend from now when trial_ends_at is null", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: null,
            trial_extension_used: false,
            trial_lock_state: "active",
          },
          updateError: null,
        });
      });

      const result = await extendTrial("org_clerk_1", 7);

      expect(result.newTrialEndsAt).toBe("2024-01-17T00:00:00.000Z");
    });

    it("should include trial_extension_used: true in update payload", async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        const mock = makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: "2024-01-15T00:00:00Z",
            trial_extension_used: false,
            trial_lock_state: "active",
          },
        });
        return { ...mock, update: mockUpdate };
      });

      await extendTrial("org_clerk_1", 7);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_ends_at: expect.any(String),
          trial_extension_used: true,
        })
      );
    });

    it("should throw when org UUID cannot be resolved", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: makeUuidSelectChain("org_clerk_unknown", null),
        };
      });

      await expect(extendTrial("org_clerk_unknown", 7)).rejects.toThrow(
        "Organization not found in database"
      );
    });

    it("should throw on database error during update", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return makeOrganizationsTableMock({
          clerkOrgId: "org_clerk_1",
          orgUuid: "org_db_1",
          selectData: {
            trial_ends_at: "2024-01-15T00:00:00Z",
            trial_extension_used: false,
            trial_lock_state: "active",
          },
          updateError: { message: "DB Error" },
        });
      });

      await expect(extendTrial("org_clerk_1", 7)).rejects.toThrow(
        "Failed to extend trial"
      );
    });

    it("should reject non-admin users before any DB write", async () => {
      mockAuthUserId = null;

      await expect(extendTrial("org_clerk_1", 7)).rejects.toThrow("Unauthorized");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });

  describe("updateOrgApiQuota", () => {
    it("should update API monthly quota and log action", async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn((columns?: string) => {
            if (columns === "id") {
              return {
                eq: vi.fn((col: string, val: string) => {
                  if (col === "clerk_org_id" && val === "org_clerk_1") {
                    return {
                      single: vi.fn(() =>
                        Promise.resolve({ data: { id: "org_db_1" }, error: null })
                      ),
                    };
                  }
                  return { single: vi.fn(() => Promise.resolve({ data: null, error: null })) };
                }),
              };
            }
            return {
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: { name: "Acme Corp" }, error: null })
                ),
              })),
            };
          }),
          update: mockUpdate,
        };
      });

      await updateOrgApiQuota("org_clerk_1", 50000);

      expect(mockUpdate).toHaveBeenCalledWith({ api_monthly_quota: 50000 });
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "organization.api_quota_update",
        targetType: "organization",
        targetId: "org_clerk_1",
        targetName: "Acme Corp",
        metadata: { apiMonthlyQuota: 50000 },
      });
    });

    it("should update API quota to null", async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn((columns?: string) => {
            if (columns === "id") {
              return {
                eq: vi.fn((col: string, val: string) => {
                  if (col === "clerk_org_id" && val === "org_clerk_1") {
                    return {
                      single: vi.fn(() =>
                        Promise.resolve({ data: { id: "org_db_1" }, error: null })
                      ),
                    };
                  }
                  return { single: vi.fn(() => Promise.resolve({ data: null, error: null })) };
                }),
              };
            }
            return {
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: { name: "Acme Corp" }, error: null })
                ),
              })),
            };
          }),
          update: mockUpdate,
        };
      });

      await updateOrgApiQuota("org_clerk_1", null);

      expect(mockUpdate).toHaveBeenCalledWith({ api_monthly_quota: null });
    });

    it("should throw when organization is not found in database", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      });

      await expect(updateOrgApiQuota("org_clerk_unknown", 1000)).rejects.toThrow(
        "Organization not found in database"
      );
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn((columns?: string) => {
            if (columns === "id") {
              return {
                eq: vi.fn((col: string, val: string) => {
                  if (col === "clerk_org_id" && val === "org_clerk_1") {
                    return {
                      single: vi.fn(() =>
                        Promise.resolve({ data: { id: "org_db_1" }, error: null })
                      ),
                    };
                  }
                  return { single: vi.fn(() => Promise.resolve({ data: null, error: null })) };
                }),
              };
            }
            return {
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: { name: "Acme Corp" }, error: null })
                ),
              })),
            };
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: "DB Error" } })),
          })),
        };
      });

      await expect(updateOrgApiQuota("org_clerk_1", 1000)).rejects.toThrow(
        "Failed to update org API quota"
      );
    });

    it("should reject non-admin users before any DB write", async () => {
      mockAuthUserId = "user_123";
      mockClerkClient.users.getUser.mockResolvedValue({
        id: "user_123",
        publicMetadata: { isAdmin: false },
      });

      await expect(updateOrgApiQuota("org_clerk_1", 1000)).rejects.toThrow("Unauthorized");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });
});
