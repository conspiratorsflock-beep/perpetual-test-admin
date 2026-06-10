import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSupportTickets,
  getSupportTicketById,
  getSupportTicketComments,
  getSupportTicketEvents,
  getSupportTicketLinks,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  addTicketComment,
  closeTicket,
  getCannedResponses,
  incrementCannedResponseUse,
  getSupportTeam,
  addTeamMember,
} from "../support-tickets";
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
};

let mockAuthUserId: string | null = "admin_123";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: mockAuthUserId,
    }),
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

const mockTicketRow = {
  id: "ticket_1",
  ticket_number: 1001,
  user_id: "user_1",
  user_email: "user@example.com",
  user_name: "John Doe",
  org_id: "org_1",
  subject: "Help",
  description: "I need help",
  category: "technical",
  status: "open",
  priority: "high",
  assigned_to: null,
  sla_deadline: "2024-03-15T00:00:00Z",
  resolved_at: null,
  closed_at: null,
  is_active: true,
  metadata: {},
  source: "web",
  browser_info: "Chrome",
  os_info: "macOS",
  app_version: "1.0.0",
  created_at: "2024-03-01T00:00:00Z",
  updated_at: "2024-03-01T00:00:00Z",
};

const mockCommentRow = {
  id: "comment_1",
  ticket_id: "ticket_1",
  author_id: "agent_1",
  author_email: "agent@example.com",
  author_name: "Agent",
  is_agent: true,
  is_internal: false,
  is_edited: false,
  content: "I'll help",
  attachments: [],
  created_at: "2024-03-01T10:00:00Z",
  edited_at: null,
};

const mockEventRow = {
  id: "event_1",
  ticket_id: "ticket_1",
  event_type: "assigned",
  old_value: null,
  new_value: "agent_1",
  performed_by: "admin_1",
  performed_by_name: "admin@example.com",
  metadata: {},
  created_at: "2024-03-01T10:00:00Z",
};

const mockLinkRow = {
  id: "link_1",
  ticket_id: "ticket_1",
  resource_type: "project",
  resource_id: "proj_1",
  resource_name: "Project One",
  resource_url: "https://example.com",
  created_by: "agent_1",
  created_at: "2024-03-01T10:00:00Z",
};

/** Builds the main queue query chain: .select(...).is(...).order(...).in(...).range(...).or(...).then() */
function makeQueueQueryChain(result: { data: unknown; error: unknown; count: number }) {
  const chain = {
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    range: vi.fn(() => Promise.resolve(result)),
  };
  return vi.fn(() => chain);
}

describe("Support Ticket Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId = "admin_123";
    mockClerkClient.users.getUser.mockResolvedValue({
      id: "admin_123",
      publicMetadata: { isAdmin: true },
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
  });

  describe("getSupportTickets", () => {
    it("should return mapped tickets and count", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return {
          select: makeQueueQueryChain({
            data: [mockTicketRow],
            error: null,
            count: 1,
          }),
        };
      });

      const result = await getSupportTickets();

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].id).toBe("ticket_1");
      expect(result.tickets[0].status).toBe("open");
      expect(result.count).toBe(1);
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should apply status filter", async () => {
      const mockSelect = makeQueueQueryChain({ data: [], error: null, count: 0 });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return { select: mockSelect };
      });

      await getSupportTickets({ status: ["open", "pending"] });

      const chain = mockSelect.mock.results[0].value;
      expect(chain.in).toHaveBeenCalledWith("status", ["open", "pending"]);
    });

    it("should apply assignedTo filter", async () => {
      const mockSelect = makeQueueQueryChain({ data: [], error: null, count: 0 });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return { select: mockSelect };
      });

      await getSupportTickets({ assignedTo: "agent_1" });

      const chain = mockSelect.mock.results[0].value;
      expect(chain.eq).toHaveBeenCalledWith("assigned_to", "agent_1");
    });

    it("should apply unassigned filter", async () => {
      const mockSelect = makeQueueQueryChain({ data: [], error: null, count: 0 });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return { select: mockSelect };
      });

      await getSupportTickets({ unassigned: true });

      const chain = mockSelect.mock.results[0].value;
      expect(chain.is).toHaveBeenCalledWith("assigned_to", null);
    });

    it("should apply search filter", async () => {
      const mockSelect = makeQueueQueryChain({ data: [], error: null, count: 0 });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return { select: mockSelect };
      });

      await getSupportTickets({ search: "billing" });

      const chain = mockSelect.mock.results[0].value;
      expect(chain.or).toHaveBeenCalledWith(
        "subject.ilike.%billing%,description.ilike.%billing%,user_email.ilike.%billing%"
      );
    });

    it("should apply pagination", async () => {
      const mockSelect = makeQueueQueryChain({ data: [], error: null, count: 0 });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return { select: mockSelect };
      });

      await getSupportTickets({ limit: 10, offset: 20 });

      const chain = mockSelect.mock.results[0].value;
      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return {
          select: makeQueueQueryChain({
            data: null,
            error: { message: "DB Error" },
            count: 0,
          }),
        };
      });

      await expect(getSupportTickets()).rejects.toThrow("Failed to fetch tickets");
    });

    it("should reject non-admin users", async () => {
      mockAuthUserId = null;

      await expect(getSupportTickets()).rejects.toThrow("Unauthorized");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe("getSupportTicketById", () => {
    it("should return mapped ticket", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockTicketRow, error: null })),
              })),
            })),
          })),
        };
      });

      const result = await getSupportTicketById("ticket_1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("ticket_1");
    });

    it("should return null for PGRST116", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_tickets") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { code: "PGRST116" } })
                ),
              })),
            })),
          })),
        };
      });

      const result = await getSupportTicketById("missing");

      expect(result).toBeNull();
    });
  });

  describe("getSupportTicketComments", () => {
    it("should return mapped comments", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_ticket_comments") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({ data: [mockCommentRow], error: null })
              ),
            })),
          })),
        };
      });

      const result = await getSupportTicketComments("ticket_1");

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("I'll help");
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_ticket_comments") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB Error" } })),
            })),
          })),
        };
      });

      await expect(getSupportTicketComments("ticket_1")).rejects.toThrow("Failed to fetch comments");
    });
  });

  describe("getSupportTicketEvents", () => {
    it("should return mapped events", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_ticket_events") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [mockEventRow], error: null })),
            })),
          })),
        };
      });

      const result = await getSupportTicketEvents("ticket_1");

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe("assigned");
    });
  });

  describe("getSupportTicketLinks", () => {
    it("should return mapped links", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== "support_ticket_links") return {};
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [mockLinkRow], error: null })),
            })),
          })),
        };
      });

      const result = await getSupportTicketLinks("ticket_1");

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe("Project One");
    });
  });
});
