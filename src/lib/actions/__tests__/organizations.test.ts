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
      const mockUpdate = makeUpdateChain(null);
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: makeUuidSelectChain("org_clerk_1", "org_db_1"),
          update: mockUpdate,
        };
      });

      await changeTrialState("org_clerk_1", "hard_locked", "abuse");

      // The exact wire value must be in the update payload
      expect(mockUpdate).toHaveBeenCalledWith({ trial_lock_state: "hard_locked" });
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

    it("should reject invalid input before any DB write", async () => {
      await expect(changeTrialState("", "hard_locked")).rejects.toThrow("Invalid input");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should reject invalid trial state before any DB write", async () => {
      await expect(changeTrialState("org_clerk_1", "invalid_state" as unknown as "active")).rejects.toThrow("Invalid input");
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

    it("should reject invalid input before any DB write", async () => {
      await expect(extendTrial("", 7)).rejects.toThrow("Invalid input");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should reject invalid days before any DB write", async () => {
      await expect(extendTrial("org_clerk_1", 0)).rejects.toThrow("Invalid input");
      await expect(extendTrial("org_clerk_1", -1)).rejects.toThrow("Invalid input");
      await expect(extendTrial("org_clerk_1", 366)).rejects.toThrow("Invalid input");
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

    it("should reject invalid input before any DB write", async () => {
      await expect(updateOrgApiQuota("", 1000)).rejects.toThrow("Invalid input");
      await expect(updateOrgApiQuota("org_clerk_1", -1)).rejects.toThrow("Invalid input");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });

  describe("searchOrganizations", () => {
    it("should return mapped organizations with DB enrichment", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [mockClerkOrg],
        totalCount: 1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [mockDbOrg],
                error: null,
              })
            ),
          })),
        };
      });

      const result = await searchOrganizations();

      expect(result.orgs).toHaveLength(1);
      expect(result.orgs[0].id).toBe("org_clerk_1");
      expect(result.orgs[0].clerkOrgId).toBe("org_clerk_1");
      expect(result.orgs[0].name).toBe("Acme Corp");
      expect(result.orgs[0].trialLockState).toBe("active");
      expect(result.orgs[0].trialEndsAt).toBe("2024-01-15T00:00:00Z");
      expect(result.orgs[0].stripeCustomerId).toBe("cus_1");
      expect(result.total).toBe(1);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should pass query and pagination to Clerk", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [],
        totalCount: 0,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      });

      await searchOrganizations({ query: "acme", limit: 10, offset: 20 });

      expect(mockClerkClient.organizations.getOrganizationList).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
        query: "acme",
      });
    });

    it("should filter by trial state locally", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [
          { ...mockClerkOrg, id: "org_1" },
          { ...mockClerkOrg, id: "org_2" },
        ],
        totalCount: 2,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [
                  { ...mockDbOrg, clerk_org_id: "org_1", trial_lock_state: "hard_locked" },
                  { ...mockDbOrg, clerk_org_id: "org_2", trial_lock_state: "active" },
                ],
                error: null,
              })
            ),
          })),
        };
      });

      const result = await searchOrganizations({ trialState: "hard_locked" });

      expect(result.orgs).toHaveLength(1);
      expect(result.orgs[0].trialLockState).toBe("hard_locked");
      expect(result.total).toBe(1);
    });

    it("should default missing DB org to active state", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [mockClerkOrg],
        totalCount: 1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      });

      const result = await searchOrganizations();

      expect(result.orgs[0].trialLockState).toBe("active");
    });

    it("should throw when the org enrichment query fails (never silently default lock states)", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [mockClerkOrg],
        totalCount: 1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB Error" } })),
          })),
        };
      });

      // A swallowed error here used to render every org as "active" (bug found by
      // PLAN_04's implementer, fixed by the reviewer at landing).
      await expect(searchOrganizations()).rejects.toThrow(
        "Failed to fetch organization data: DB Error"
      );
    });
  });

  describe("getOrganizationById", () => {
    it("should return organization with members, projects and usage", async () => {
      mockClerkClient.organizations.getOrganization.mockResolvedValue(mockClerkOrg);
      mockClerkClient.organizations.getOrganizationMembershipList.mockResolvedValue({
        data: [
          {
            publicUserData: { userId: "user_1", identifier: "user@example.com", firstName: "John", lastName: "Doe" },
            role: "admin",
            createdAt: Date.now(),
          },
        ],
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "organizations") {
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
                  single: vi.fn(() => Promise.resolve({ data: mockDbOrg, error: null })),
                })),
              };
            }),
          };
        }
        if (table === "projects") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() =>
                  Promise.resolve({
                    data: [{ id: "proj_1", name: "Project One", created_at: "2024-02-01T00:00:00Z" }],
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        if (table === "api_usage_logs") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => Promise.resolve({ count: 42, error: null })),
              })),
            })),
          };
        }
        return {};
      });

      const result = await getOrganizationById("org_clerk_1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("org_clerk_1");
      expect(result?.members).toHaveLength(1);
      expect(result?.members[0].email).toBe("user@example.com");
      expect(result?.projects).toHaveLength(1);
      expect(result?.projects[0].name).toBe("Project One");
      expect(result?.usage.apiCallsThisMonth).toBe(42);
      expect(result?.dbOrgId).toBe("org_db_1");
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should return null when Clerk throws", async () => {
      mockClerkClient.organizations.getOrganization.mockRejectedValue(new Error("Not found"));

      const result = await getOrganizationById("org_unknown");

      expect(result).toBeNull();
    });

    it("should reject non-admin users", async () => {
      mockAuthUserId = null;

      await expect(getOrganizationById("org_clerk_1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("getOrgApiUsage", () => {
    it("should return mapped usage rows", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "org_api_usage") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { org_id: "org_db_1", year_month: "2024-03", total_calls: 1500, updated_at: "2024-03-15T00:00:00Z" },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        };
      });

      const result = await getOrgApiUsage("org_db_1");

      expect(result).toHaveLength(1);
      expect(result[0].orgId).toBe("org_db_1");
      expect(result[0].year).toBe(2024);
      expect(result[0].month).toBe(3);
      expect(result[0].totalCalls).toBe(1500);
      expect(result[0].totalTokens).toBe(0);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "org_api_usage") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB Error" } })),
            })),
          })),
        };
      });

      await expect(getOrgApiUsage("org_db_1")).rejects.toThrow("Failed to fetch org API usage");
    });
  });

  describe("getTrialMetrics", () => {
    it("should aggregate trial lock states", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { trial_lock_state: "active" },
                { trial_lock_state: "active" },
                { trial_lock_state: "soft_locked" },
                { trial_lock_state: "hard_locked" },
                { trial_lock_state: "paid" },
              ],
              error: null,
            })
          ),
        };
      });

      const result = await getTrialMetrics();

      expect(result.activeTrials).toBe(2);
      expect(result.softLocked).toBe(1);
      expect(result.hardLocked).toBe(1);
      expect(result.paid).toBe(1);
      expect(result.conversionRate).toBe(20);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should return zeros on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB Error" } })),
        };
      });

      const result = await getTrialMetrics();

      expect(result).toEqual({
        activeTrials: 0,
        softLocked: 0,
        hardLocked: 0,
        paid: 0,
        conversionRate: 0,
      });
    });
  });

  describe("getTotalOrgCount", () => {
    it("should return total org count from Clerk", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [],
        totalCount: 42,
      });

      const result = await getTotalOrgCount();

      expect(result).toBe(42);
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });

  describe("getTrialsExpiringSoon", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-03-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return count of trials expiring within 7 days", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ count: 3, error: null })),
              })),
            })),
          })),
        };
      });

      const result = await getTrialsExpiringSoon();

      expect(result).toBe(3);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should return 0 on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ count: null, error: { message: "DB Error" } })),
              })),
            })),
          })),
        };
      });

      const result = await getTrialsExpiringSoon();

      expect(result).toBe(0);
    });
  });

  describe("exportOrganizationsToCSV", () => {
    it("should export organizations with current column values", async () => {
      mockClerkClient.organizations.getOrganizationList.mockResolvedValue({
        data: [mockClerkOrg],
        totalCount: 1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "organizations") return {};
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [mockDbOrg],
                error: null,
              })
            ),
          })),
        };
      });

      const result = await exportOrganizationsToCSV();

      expect(result).toContain("Name,Slug,Trial State,Trial Ends At,Members,Stripe Subscription ID,Created At");
      expect(result).toContain("Acme Corp");
      expect(result).toContain("active");
      expect(result).toContain("sub_1");
      expect(logAdminAction).not.toHaveBeenCalled();
    });
  });
});
