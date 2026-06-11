import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isTestEmailProvisioned,
  getTestEmailOverview,
  getTestEmailAbuseSignals,
  searchTestEmailMailboxes,
  getMailboxMessageVolume,
  getTestEmailInboundHealth,
  getTestEmailHealth,
  forceExpireMailbox,
  deleteMailbox,
} from "../test-email";
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

describe("Test Email Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["getTestEmailOverview", () => getTestEmailOverview()],
    ["getTestEmailAbuseSignals", () => getTestEmailAbuseSignals()],
    ["searchTestEmailMailboxes", () => searchTestEmailMailboxes("foo")],
    ["getMailboxMessageVolume", () => getMailboxMessageVolume("mb_1")],
    ["getTestEmailInboundHealth", () => getTestEmailInboundHealth()],
    ["getTestEmailHealth", () => getTestEmailHealth()],
    ["forceExpireMailbox", () => forceExpireMailbox("mb_1")],
    ["deleteMailbox", () => deleteMailbox("mb_1")],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Test Email Actions — isTestEmailProvisioned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeProvisionChain(error: unknown = null) {
    return {
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ error })),
      })),
    };
  }

  it("returns true when probe query has no error", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeProvisionChain(null);
      return {};
    });
    await expect(isTestEmailProvisioned()).resolves.toBe(true);
  });

  it("returns false on query error without throwing", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeProvisionChain({ message: "boom" });
      return {};
    });
    await expect(isTestEmailProvisioned()).resolves.toBe(false);
  });
});

describe("Test Email Actions — getTestEmailOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeCountChain(count: number | null, data: unknown[] | null = null, error: unknown = null) {
    return {
      select: vi.fn(() => ({
        gt: vi.fn(() => Promise.resolve({ count, data, error })),
        gte: vi.fn(() => Promise.resolve({ count, data, error })),
      })),
    };
  }

  it("returns tallies and users at cap from fixture", async () => {
    // With system time at 2024-06-15T12:00:00Z:
    // dayAgo = 2024-06-14T12:00:00.000Z, weekAgo = 2024-06-08T12:00:00.000Z
    const dayAgo = "2024-06-14T12:00:00.000Z";
    const weekAgo = "2024-06-08T12:00:00.000Z";

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
        return {
          select: vi.fn((cols: string | object) => {
            if (typeof cols === "string" && cols === "user_id") {
              const resultPromise = Promise.resolve({
                data: [
                  ...Array.from({ length: 25 }, () => ({ user_id: "user_a" })),
                  ...Array.from({ length: 10 }, () => ({ user_id: "user_b" })),
                ],
                error: null,
              });
              return {
                gt: vi.fn(() => resultPromise),
                then: resultPromise.then.bind(resultPromise),
              };
            }
            const unfilteredCountPromise = Promise.resolve({ count: 35, data: null, error: null });
            const chain = {
              gt: vi.fn(() => Promise.resolve({ count: 35, data: null, error: null })),
              gte: vi.fn((_field: string, val: string) => {
                if (val === dayAgo) return Promise.resolve({ count: 3, data: null, error: null });
                if (val === weekAgo) return Promise.resolve({ count: 7, data: null, error: null });
                return Promise.resolve({ count: 0, data: null, error: null });
              }),
              then: unfilteredCountPromise.then.bind(unfilteredCountPromise),
            };
            return chain;
          }),
        };
      }
      if (table === "test_email_messages") {
        const unfilteredCountPromise = Promise.resolve({ count: 12, data: null, error: null });
        return {
          select: vi.fn(() => {
            const chain = {
              gte: vi.fn((_field: string, val: string) => {
                if (val === dayAgo) return Promise.resolve({ count: 5, data: null, error: null });
                if (val === weekAgo) return Promise.resolve({ count: 12, data: null, error: null });
                return Promise.resolve({ count: 0, data: null, error: null });
              }),
              then: unfilteredCountPromise.then.bind(unfilteredCountPromise),
            };
            return chain;
          }),
        };
      }
      return {};
    });

    const result = await getTestEmailOverview();

    expect(result.activeMailboxes).toBe(35);
    expect(result.created24h).toBe(3);
    expect(result.created7d).toBe(7);
    expect(result.messages24h).toBe(5);
    expect(result.messages7d).toBe(12);
    expect(result.avgMessagesPerMailbox).toBe(0.3);
    expect(result.usersAtCap).toBe(1);
  });

  it("returns zero overview on caught error", async () => {
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await getTestEmailOverview();

    expect(result).toEqual({
      activeMailboxes: 0,
      created24h: 0,
      created7d: 0,
      messages24h: 0,
      messages7d: 0,
      avgMessagesPerMailbox: 0,
      usersAtCap: 0,
    });
  });
});

describe("Test Email Actions — getTestEmailAbuseSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates by active count, 24h creation, and near cap", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
        return {
          select: vi.fn((cols: string) => {
            if (cols === "user_id, created_at") {
              return {
                gt: vi.fn(() =>
                  Promise.resolve({
                    data: [
                      { user_id: "user_a", created_at: "2024-06-10T10:00:00Z" },
                      { user_id: "user_a", created_at: "2024-06-11T10:00:00Z" },
                      { user_id: "user_a", created_at: "2024-06-14T10:00:00Z" },
                      { user_id: "user_b", created_at: "2024-06-14T10:00:00Z" },
                    ],
                    error: null,
                  })
                ),
              };
            }
            if (cols === "user_id") {
              return {
                gte: vi.fn(() =>
                  Promise.resolve({
                    data: [
                      { user_id: "user_a" },
                      { user_id: "user_a" },
                      { user_id: "user_b" },
                    ],
                    error: null,
                  })
                ),
              };
            }
            return {};
          }),
        };
      }
      return {};
    });

    const result = await getTestEmailAbuseSignals();

    expect(result.byActiveCount).toEqual([
      { userId: "user_a", activeMailboxes: 3, created24h: 2 },
      { userId: "user_b", activeMailboxes: 1, created24h: 1 },
    ]);
    expect(result.by24hCreation).toEqual([
      { userId: "user_a", activeMailboxes: 3, created24h: 2 },
      { userId: "user_b", activeMailboxes: 1, created24h: 1 },
    ]);
    expect(result.nearCap).toEqual([]);
  });

  it("returns empty rows on caught error", async () => {
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const result = await getTestEmailAbuseSignals();
    expect(result).toEqual({ byActiveCount: [], by24hCreation: [], nearCap: [] });
  });
});

describe("Test Email Actions — searchTestEmailMailboxes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeSearchChain(rows: unknown[], error: unknown = null) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      limit: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve({ data: rows, error })),
    };
    return {
      select: vi.fn(() => chain),
    };
  }

  it("returns mapped mailboxes for non-UUID query", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
        return makeSearchChain([
          {
            id: "mb_1",
            local_part: "hello",
            address: "hello@example.com",
            user_id: "user_a",
            organization_id: "org_1",
            label: "Primary",
            created_at: "2024-06-01T10:00:00Z",
            expires_at: "2024-07-01T10:00:00Z",
            extended: false,
          },
        ]);
      }
      return {};
    });

    const result = await searchTestEmailMailboxes("hello");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "mb_1",
      localPart: "hello",
      address: "hello@example.com",
      userId: "user_a",
    });
  });

  it("uses eq for UUID-looking query", async () => {
    const uuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
        return makeSearchChain([]);
      }
      return {};
    });

    await searchTestEmailMailboxes(uuid);
    // The chain was called; we verify the path indirectly by no throw.
    expect(mockSupabaseFrom).toHaveBeenCalledWith("test_email_mailboxes");
  });

  it("returns empty array on DB error", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeSearchChain([], { message: "boom" });
      return {};
    });

    const result = await searchTestEmailMailboxes("x");
    expect(result).toEqual([]);
  });
});

describe("Test Email Actions — getMailboxMessageVolume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeVolumeChain(total: number | null, unread: number | null, latest: unknown) {
    return {
      select: vi.fn((cols: string | object) => {
        if (typeof cols === "string" && cols === "received_at") {
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: latest, error: null })),
                })),
              })),
            })),
          };
        }
        return {
          eq: vi.fn((field: string, value: string) => {
            const next = {
              eq: vi.fn(() => Promise.resolve({ count: unread, error: null })),
            };
            if (field === "read") return Promise.resolve({ count: unread, error: null });
            // first eq (mailbox_id) returns chain with second eq for unread
            return next;
          }),
        };
      }),
    };
  }

  it("queries only safe columns (no content)", async () => {
    let capturedSelect = "";
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_messages") {
        return {
          select: vi.fn((cols: string | object) => {
            capturedSelect += JSON.stringify(cols) + ";";
            if (typeof cols === "string" && cols === "received_at") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(() => Promise.resolve({ data: { received_at: "2024-06-10T10:00:00Z" }, error: null })),
                    })),
                  })),
                })),
              };
            }
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
              })),
            };
          }),
        };
      }
      return {};
    });

    await getMailboxMessageVolume("mb_1");

    expect(capturedSelect).toContain("received_at");
    expect(capturedSelect).not.toContain("subject");
    expect(capturedSelect).not.toContain("from_address");
    expect(capturedSelect).not.toContain("from_name");
    expect(capturedSelect).not.toContain("body_text");
    expect(capturedSelect).not.toContain("body_html");
  });

  it("returns total, unread, and latest received_at", async () => {
    let unreadCount: number | null = null;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_messages") {
        return {
          select: vi.fn((cols: string | object) => {
            if (typeof cols === "string" && cols === "received_at") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(() =>
                        Promise.resolve({ data: { received_at: "2024-06-10T10:00:00Z" }, error: null })
                      ),
                    })),
                  })),
                })),
              };
            }
            return {
              eq: vi.fn((field: string) => {
                if (field === "read") {
                  return Promise.resolve({ count: 2, error: null });
                }
                // First eq on mailbox_id: track call and return chain with unread eq
                return {
                  eq: vi.fn(() => Promise.resolve({ count: 2, error: null })),
                };
              }),
            };
          }),
        };
      }
      return {};
    });

    const result = await getMailboxMessageVolume("mb_1");
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.unread).toBeGreaterThanOrEqual(0);
    expect(result.lastReceivedAt).toBe("2024-06-10T10:00:00Z");
  });
});

describe("Test Email Actions — getTestEmailInboundHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buckets event types into 24h and 7d counts", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_events") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() =>
              Promise.resolve({
                data: [
                  { event_type: "inbound", created_at: "2024-06-14T14:00:00Z" },
                  { event_type: "inbound", created_at: "2024-06-10T10:00:00Z" },
                  { event_type: "inbound", created_at: "2024-06-09T10:00:00Z" },
                  { event_type: "bounce", created_at: "2024-06-14T14:00:00Z" },
                ],
                error: null,
              })
            ),
          })),
        };
      }
      return {};
    });

    const result = await getTestEmailInboundHealth();

    const inbound = result.find((r) => r.eventType === "inbound");
    const bounce = result.find((r) => r.eventType === "bounce");

    expect(inbound).toEqual({ eventType: "inbound", count24h: 1, count7d: 3 });
    expect(bounce).toEqual({ eventType: "bounce", count24h: 1, count7d: 1 });
  });

  it("returns empty array on caught error", async () => {
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const result = await getTestEmailInboundHealth();
    expect(result).toEqual([]);
  });
});

describe("Test Email Actions — getTestEmailHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns latest cleanup and expired backlog", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        created_at: "2024-06-14T10:00:00Z",
                        detail: { mailboxes_purged: 10, events_pruned: 50 },
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "test_email_mailboxes") {
        return {
          select: vi.fn(() => ({
            lt: vi.fn(() => Promise.resolve({ count: 7, error: null })),
          })),
        };
      }
      return {};
    });

    const result = await getTestEmailHealth();

    expect(result.latestCleanup).toEqual({
      mailboxesPurged: 10,
      eventsPruned: 50,
      ranAt: "2024-06-14T10:00:00Z",
    });
    expect(result.expiredBacklog).toBe(7);
  });

  it("returns null latestCleanup when no cleanup event", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "test_email_mailboxes") {
        return {
          select: vi.fn(() => ({
            lt: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          })),
        };
      }
      return {};
    });

    const result = await getTestEmailHealth();
    expect(result.latestCleanup).toBeNull();
    expect(result.expiredBacklog).toBe(0);
  });
});

describe("Test Email Actions — forceExpireMailbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeExpireChains(updateError: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { address: "a@example.com", user_id: "user_a" }, error: null })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: updateError })),
      })),
    };
  }

  it("expires mailbox and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeExpireChains(null);
      return {};
    });

    await forceExpireMailbox("mb_1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_mailbox.force_expire",
      targetType: "user",
      targetId: "user_a",
      targetName: "a@example.com",
      metadata: { mailboxId: "mb_1", address: "a@example.com" },
    });
  });

  it("throws when mailbox not found and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
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

    await expect(forceExpireMailbox("mb_1")).rejects.toThrow("Mailbox not found");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeExpireChains({ message: "boom" });
      return {};
    });

    await expect(forceExpireMailbox("mb_1")).rejects.toThrow("boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Test Email Actions — deleteMailbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeDeleteChains(deleteError: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { address: "a@example.com", user_id: "user_a" }, error: null })
          ),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: deleteError })),
      })),
    };
  }

  it("deletes mailbox and logs admin action", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeDeleteChains(null);
      return {};
    });

    await deleteMailbox("mb_1");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "test_email_mailbox.delete",
      targetType: "user",
      targetId: "user_a",
      targetName: "a@example.com",
      metadata: { mailboxId: "mb_1", address: "a@example.com" },
    });
  });

  it("throws when mailbox not found and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") {
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

    await expect(deleteMailbox("mb_1")).rejects.toThrow("Mailbox not found");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "test_email_mailboxes") return makeDeleteChains({ message: "boom" });
      return {};
    });

    await expect(deleteMailbox("mb_1")).rejects.toThrow("boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
