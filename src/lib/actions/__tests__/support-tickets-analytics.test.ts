import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSupportAnalytics,
  getTicketVolumeData,
  getAgentLeaderboard,
} from "../support-tickets/analytics";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";

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

describe("Support Tickets Analytics — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("getSupportAnalytics rejects before Supabase call", async () => {
    await expect(getSupportAnalytics({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getTicketVolumeData rejects before Supabase call", async () => {
    await expect(getTicketVolumeData({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getAgentLeaderboard rejects before Supabase call", async () => {
    await expect(getAgentLeaderboard({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Support Tickets Analytics — getSupportAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeTicketsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: rows, error })),
        })),
      })),
    };
  }

  function makeTeamChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => Promise.resolve({ data: rows, error })),
    };
  }

  function makeCommentsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: rows, error })),
        })),
      })),
    };
  }

  it("throws when the tickets query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") return makeTicketsChain([], { message: "boom" });
      return {};
    });

    await expect(getSupportAnalytics({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow(
      "Failed to fetch analytics: boom"
    );
  });

  it("returns zeros and skips team/comments queries when no tickets", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") return makeTicketsChain([]);
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-01-01", endDate: "2024-01-31" });

    expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith("support_tickets");
    expect(result).toEqual({
      totalTickets: 0,
      openTickets: 0,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      avgResponseTimeMinutes: 0,
      avgResolutionTimeMinutes: 0,
      slaCompliancePct: 100,
    });
  });

  it("tallies byStatus, byPriority, byCategory and openTickets", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
          { id: "t2", status: "in_progress", priority: "medium", category: "bug", resolved_at: null, created_at: "2024-06-02T10:00:00Z", sla_deadline: null },
          { id: "t3", status: "resolved", priority: "low", category: "feature", resolved_at: "2024-06-04T10:00:00Z", created_at: "2024-06-03T10:00:00Z", sla_deadline: null },
          { id: "t4", status: "pending", priority: "high", category: "billing", resolved_at: null, created_at: "2024-06-04T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([]);
      if (table === "support_ticket_comments") return makeCommentsChain([]);
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" });

    expect(result.byStatus).toEqual({ open: 1, in_progress: 1, resolved: 1, pending: 1 });
    expect(result.byPriority).toEqual({ high: 2, medium: 1, low: 1 });
    expect(result.byCategory).toEqual({ bug: 2, feature: 1, billing: 1 });
    expect(result.openTickets).toBe(3);
  });

  it("calculates SLA compliance for resolved and unresolved tickets against now", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          // resolved before deadline
          { id: "t1", status: "resolved", priority: "high", category: "bug", resolved_at: "2024-06-14T10:00:00Z", created_at: "2024-06-10T10:00:00Z", sla_deadline: "2024-06-15T12:00:00Z" },
          // resolved after deadline
          { id: "t2", status: "resolved", priority: "high", category: "bug", resolved_at: "2024-06-16T10:00:00Z", created_at: "2024-06-10T10:00:00Z", sla_deadline: "2024-06-15T12:00:00Z" },
          // unresolved, current time before deadline
          { id: "t3", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-10T10:00:00Z", sla_deadline: "2024-06-16T12:00:00Z" },
          // unresolved, current time after deadline
          { id: "t4", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-10T10:00:00Z", sla_deadline: "2024-06-14T12:00:00Z" },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([]);
      if (table === "support_ticket_comments") return makeCommentsChain([]);
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" });

    // slaChecked = 4, slaMet = t1 (resolved<=deadline) + t3 (now<=deadline) = 2
    expect(result.slaCompliancePct).toBe(50);
  });

  it("returns 100% SLA compliance when no rows have sla_deadline", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([]);
      if (table === "support_ticket_comments") return makeCommentsChain([]);
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" });
    expect(result.slaCompliancePct).toBe(100);
  });

  it("calculates rounded average resolution time excluding non-positive durations", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "resolved", priority: "high", category: "bug", resolved_at: "2024-06-02T10:00:00Z", created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
          { id: "t2", status: "resolved", priority: "high", category: "bug", resolved_at: "2024-06-03T10:00:00Z", created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
          // unresolved -> excluded
          { id: "t3", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
          // same timestamp -> 0 mins -> excluded
          { id: "t4", status: "resolved", priority: "high", category: "bug", resolved_at: "2024-06-01T10:00:00Z", created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([]);
      if (table === "support_ticket_comments") return makeCommentsChain([]);
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" });
    // (1440 + 2880) / 2 = 2160
    expect(result.avgResolutionTimeMinutes).toBe(2160);
  });

  it("calculates first response time from first agent comment per ticket", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
          { id: "t2", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") {
        return makeTeamChain([{ user_id: "agent_1" }, { user_id: "agent_2" }]);
      }
      if (table === "support_ticket_comments") {
        return makeCommentsChain([
          // non-agent earlier comment should not win
          { ticket_id: "t1", author_id: "user_a", created_at: "2024-06-01T10:30:00Z" },
          // first agent comment for t1
          { ticket_id: "t1", author_id: "agent_1", created_at: "2024-06-01T11:00:00Z" },
          // second agent comment for t1 should be ignored
          { ticket_id: "t1", author_id: "agent_2", created_at: "2024-06-01T12:00:00Z" },
          // first agent comment for t2
          { ticket_id: "t2", author_id: "agent_1", created_at: "2024-06-01T12:00:00Z" },
        ]);
      }
      return {};
    });

    const result = await getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" });
    // t1: 60 mins, t2: 120 mins -> avg 90
    expect(result.avgResponseTimeMinutes).toBe(90);
  });

  it("throws when the team members sub-query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([], { message: "team boom" });
      return {};
    });

    // Swallowed sub-query errors used to become avgResponseTimeMinutes: 0
    // (found by PLAN_13's implementer, fixed by the reviewer at landing).
    await expect(getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" })).rejects.toThrow(
      "Failed to fetch team members: team boom"
    );
  });

  it("throws when the comments sub-query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { id: "t1", status: "open", priority: "high", category: "bug", resolved_at: null, created_at: "2024-06-01T10:00:00Z", sla_deadline: null },
        ]);
      }
      if (table === "support_team_members") return makeTeamChain([{ user_id: "agent_1" }]);
      if (table === "support_ticket_comments") return makeCommentsChain([], { message: "comments boom" });
      return {};
    });

    await expect(getSupportAnalytics({ startDate: "2024-06-01", endDate: "2024-06-30" })).rejects.toThrow(
      "Failed to fetch comments: comments boom"
    );
  });
});

describe("Support Tickets Analytics — getTicketVolumeData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeTicketsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: rows, error })),
        })),
      })),
    };
  }

  it("throws when query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") return makeTicketsChain([], { message: "vol boom" });
      return {};
    });

    await expect(getTicketVolumeData({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow(
      "Failed to fetch volume data: vol boom"
    );
  });

  it("buckets created and resolved on their own dates and skips null created_at", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { created_at: "2024-06-01T10:00:00Z", resolved_at: "2024-06-03T10:00:00Z" },
          { created_at: "2024-06-01T12:00:00Z", resolved_at: null },
          { created_at: "2024-06-02T10:00:00Z", resolved_at: "2024-06-02T14:00:00Z" },
          { created_at: null, resolved_at: "2024-06-04T10:00:00Z" },
        ]);
      }
      return {};
    });

    const result = await getTicketVolumeData({ startDate: "2024-06-01", endDate: "2024-06-30" });

    expect(result).toEqual([
      { date: "2024-06-01", created: 2, resolved: 0 },
      { date: "2024-06-02", created: 1, resolved: 1 },
      { date: "2024-06-03", created: 0, resolved: 1 },
    ]);
  });

  it("sorts output ascending by date", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return makeTicketsChain([
          { created_at: "2024-06-05T10:00:00Z", resolved_at: null },
          { created_at: "2024-06-01T10:00:00Z", resolved_at: null },
          { created_at: "2024-06-03T10:00:00Z", resolved_at: null },
        ]);
      }
      return {};
    });

    const result = await getTicketVolumeData({ startDate: "2024-06-01", endDate: "2024-06-30" });
    expect(result.map((r) => r.date)).toEqual(["2024-06-01", "2024-06-03", "2024-06-05"]);
  });
});

describe("Support Tickets Analytics — getAgentLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  function makeAgentsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => Promise.resolve({ data: rows, error })),
    };
  }

  function makeTicketsChain(rows: unknown[], error: unknown = null) {
    return {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data: rows, error })),
          })),
        })),
      })),
    };
  }

  it("throws when agents query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_team_members") return makeAgentsChain([], { message: "agents boom" });
      return {};
    });

    await expect(getAgentLeaderboard({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow(
      "Failed to fetch agents: agents boom"
    );
  });

  it("returns empty array when no agents and does not query tickets", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_team_members") return makeAgentsChain([]);
      return {};
    });

    const result = await getAgentLeaderboard({ startDate: "2024-01-01", endDate: "2024-01-31" });

    expect(result).toEqual([]);
    expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith("support_team_members");
  });

  it("throws when tickets query fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_team_members") {
        return makeAgentsChain([{ user_id: "a1", name: "Alice", email: "alice@example.com" }]);
      }
      if (table === "support_tickets") return makeTicketsChain([], { message: "tickets boom" });
      return {};
    });

    await expect(getAgentLeaderboard({ startDate: "2024-01-01", endDate: "2024-01-31" })).rejects.toThrow(
      "Failed to fetch tickets: tickets boom"
    );
  });

  it("includes agents with zero tickets and counts openAssigned by wire statuses", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_team_members") {
        return makeAgentsChain([
          { user_id: "a1", name: "Alice", email: "alice@example.com" },
          { user_id: "a2", name: "Bob", email: "bob@example.com" },
        ]);
      }
      if (table === "support_tickets") {
        return makeTicketsChain([
          { assigned_to: "a1", resolved_at: "2024-06-02T10:00:00Z", created_at: "2024-06-01T10:00:00Z", status: "resolved" },
          { assigned_to: "a1", resolved_at: null, created_at: "2024-06-01T10:00:00Z", status: "open" },
          { assigned_to: "a1", resolved_at: null, created_at: "2024-06-01T10:00:00Z", status: "in_progress" },
        ]);
      }
      return {};
    });

    const result = await getAgentLeaderboard({ startDate: "2024-06-01", endDate: "2024-06-30" });

    const alice = result.find((a) => a.userId === "a1");
    const bob = result.find((a) => a.userId === "a2");

    expect(alice).toEqual({
      userId: "a1",
      name: "Alice",
      email: "alice@example.com",
      resolved: 1,
      avgResolutionMinutes: 1440,
      openAssigned: 2,
    });
    expect(bob).toEqual({
      userId: "a2",
      name: "Bob",
      email: "bob@example.com",
      resolved: 0,
      avgResolutionMinutes: 0,
      openAssigned: 0,
    });
  });

  it("sorts results by resolved count descending", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "support_team_members") {
        return makeAgentsChain([
          { user_id: "a1", name: "Alice", email: "alice@example.com" },
          { user_id: "a2", name: "Bob", email: "bob@example.com" },
          { user_id: "a3", name: "Carol", email: "carol@example.com" },
        ]);
      }
      if (table === "support_tickets") {
        return makeTicketsChain([
          { assigned_to: "a2", resolved_at: "2024-06-02T10:00:00Z", created_at: "2024-06-01T10:00:00Z", status: "resolved" },
          { assigned_to: "a2", resolved_at: "2024-06-03T10:00:00Z", created_at: "2024-06-01T10:00:00Z", status: "resolved" },
          { assigned_to: "a1", resolved_at: "2024-06-02T10:00:00Z", created_at: "2024-06-01T10:00:00Z", status: "resolved" },
        ]);
      }
      return {};
    });

    const result = await getAgentLeaderboard({ startDate: "2024-06-01", endDate: "2024-06-30" });

    expect(result.map((a) => a.userId)).toEqual(["a2", "a1", "a3"]);
    expect(result[0].resolved).toBe(2);
    expect(result[1].resolved).toBe(1);
    expect(result[2].resolved).toBe(0);
  });
});
