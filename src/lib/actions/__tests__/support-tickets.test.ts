import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAdminAction } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Create mock functions
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockIs = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

// Mock Supabase with a chainable API
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mockFrom,
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// Helper to create chainable mock
const createChainableMock = (finalReturn: unknown) => {
  const chain = {
    select: mockSelect.mockReturnThis,
    insert: mockInsert.mockResolvedValue(finalReturn),
    update: mockUpdate.mockResolvedValue(finalReturn),
    delete: mockDelete.mockReturnThis,
    eq: mockEq.mockReturnThis,
    in: mockIn.mockReturnThis,
    is: mockIs.mockReturnThis,
    or: mockOr.mockReturnThis,
    order: mockOrder.mockResolvedValue(finalReturn),
    range: mockRange.mockResolvedValue(finalReturn),
    single: mockSingle.mockResolvedValue(finalReturn),
  };
  return chain;
};

// Mock ticket data
const mockTicket = {
  id: "ticket_123",
  ticket_number: 1001,
  user_id: "user_123",
  user_email: "user@example.com",
  user_name: "John Doe",
  org_id: "org_123",
  subject: "Test Ticket",
  description: "This is a test ticket",
  category: "technical",
  status: "open",
  priority: "medium",
  assigned_to: null,
  assigned_at: null,
  sla_deadline: "2026-03-08T12:00:00Z",
  first_response_at: null,
  resolved_at: null,
  source: "web",
  tags: ["bug", "urgent"],
  browser_info: "Chrome 120",
  os_info: "macOS",
  app_version: "1.0.0",
  created_at: "2026-03-07T10:00:00Z",
  updated_at: "2026-03-07T10:00:00Z",
};

const mockComment = {
  id: "comment_123",
  ticket_id: "ticket_123",
  author_id: "agent_123",
  author_email: "agent@example.com",
  author_name: "Support Agent",
  is_agent: true,
  is_internal: false,
  content: "This is a reply",
  attachments: [],
  created_at: "2026-03-07T11:00:00Z",
  edited_at: null,
};

const mockEvent = {
  id: "event_123",
  ticket_id: "ticket_123",
  event_type: "created",
  old_value: null,
  new_value: null,
  performed_by: "user_123",
  performed_by_email: "user@example.com",
  created_at: "2026-03-07T10:00:00Z",
};

describe("Support Ticket Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to return chainable by default
    mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        single: mockSingle,
        order: mockOrder,
        range: mockRange,
      }),
      in: mockIn.mockReturnValue({
        is: mockIs.mockReturnValue({
          order: mockOrder,
          range: mockRange,
        }),
        order: mockOrder,
        range: mockRange,
      }),
      is: mockIs.mockReturnValue({
        order: mockOrder,
        range: mockRange,
      }),
      or: mockOr.mockReturnValue({
        order: mockOrder,
        range: mockRange,
      }),
      order: mockOrder,
      range: mockRange,
    });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  describe("getSupportTickets", () => {
    it("should return tickets with count", async () => {
      const { getSupportTickets } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: [mockTicket], error: null, count: 1 });

      const result = await getSupportTickets();

      expect(result.tickets).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.tickets[0].id).toBe("ticket_123");
    });

    it("should throw error on database failure", async () => {
      const { getSupportTickets } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTickets()).rejects.toThrow("Failed to fetch tickets");
    });
  });

  describe("getSupportTicketById", () => {
    it("should return ticket by id", async () => {
      const { getSupportTicketById } = await import("../support-tickets");
      mockSingle.mockResolvedValue({ data: mockTicket, error: null });

      const result = await getSupportTicketById("ticket_123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("ticket_123");
    });

    it("should return null for non-existent ticket", async () => {
      const { getSupportTicketById } = await import("../support-tickets");
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await getSupportTicketById("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      const { getSupportTicketById } = await import("../support-tickets");
      mockSingle.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketById("ticket_123")).rejects.toThrow(
        "Failed to fetch ticket"
      );
    });
  });

  describe("getSupportTicketComments", () => {
    it("should return comments for ticket", async () => {
      const { getSupportTicketComments } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: [mockComment], error: null });

      const result = await getSupportTicketComments("ticket_123");

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("This is a reply");
    });

    it("should throw error on database failure", async () => {
      const { getSupportTicketComments } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketComments("ticket_123")).rejects.toThrow(
        "Failed to fetch comments"
      );
    });
  });

  describe("getSupportTicketEvents", () => {
    it("should return events for ticket", async () => {
      const { getSupportTicketEvents } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: [mockEvent], error: null });

      const result = await getSupportTicketEvents("ticket_123");

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe("created");
    });

    it("should throw error on database failure", async () => {
      const { getSupportTicketEvents } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketEvents("ticket_123")).rejects.toThrow(
        "Failed to fetch events"
      );
    });
  });

  describe("assignTicket", () => {
    it("should assign ticket to agent", async () => {
      const { assignTicket } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: null });

      await assignTicket("ticket_123", "agent_123", "agent@example.com");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to: "agent_123",
          status: "in_progress",
        })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "support_ticket.assign",
          targetType: "support_ticket",
          targetId: "ticket_123",
        })
      );
    });

    it("should throw error on database failure", async () => {
      const { assignTicket } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        assignTicket("ticket_123", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to assign ticket");
    });
  });

  describe("updateTicketStatus", () => {
    it("should update ticket status", async () => {
      const { updateTicketStatus } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: null });

      await updateTicketStatus(
        "ticket_123",
        "resolved",
        "agent_123",
        "agent@example.com"
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "resolved",
          resolved_at: expect.any(String),
        })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "support_ticket.status_change",
        })
      );
    });

    it("should throw error on database failure", async () => {
      const { updateTicketStatus } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        updateTicketStatus("ticket_123", "closed", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to update ticket status");
    });
  });

  describe("updateTicketPriority", () => {
    it("should update ticket priority and recalculate SLA", async () => {
      const { updateTicketPriority } = await import("../support-tickets");
      mockSingle.mockResolvedValue({ data: { created_at: "2026-03-07T10:00:00Z" }, error: null });
      mockUpdate.mockResolvedValue({ error: null });

      await updateTicketPriority(
        "ticket_123",
        "high",
        "agent_123",
        "agent@example.com"
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "high",
          sla_deadline: expect.any(String),
        })
      );
    });

    it("should throw error on database failure", async () => {
      const { updateTicketPriority } = await import("../support-tickets");
      mockSingle.mockResolvedValue({ data: { created_at: "2026-03-07T10:00:00Z" }, error: null });
      mockUpdate.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        updateTicketPriority("ticket_123", "urgent", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to update priority");
    });
  });

  describe("addTicketComment", () => {
    it("should add public comment", async () => {
      const { addTicketComment } = await import("../support-tickets");
      mockInsert.mockResolvedValue({ data: mockComment, error: null });
      mockSingle.mockResolvedValue({ data: { status: "open" }, error: null });

      const result = await addTicketComment(
        "ticket_123",
        "This is a reply",
        "agent_123",
        "agent@example.com",
        "Support Agent",
        false,
        true
      );

      expect(result.content).toBe("This is a reply");
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should throw error on database failure", async () => {
      const { addTicketComment } = await import("../support-tickets");
      mockInsert.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(
        addTicketComment(
          "ticket_123",
          "Test",
          "agent_123",
          "agent@example.com",
          "Agent"
        )
      ).rejects.toThrow("Failed to add comment");
    });
  });

  describe("closeTicket", () => {
    it("should close ticket", async () => {
      const { closeTicket } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: null });

      await closeTicket("ticket_123", "agent_123", "agent@example.com", "Resolved");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "closed",
          resolved_at: expect.any(String),
        })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "support_ticket.close",
        })
      );
    });

    it("should throw error on database failure", async () => {
      const { closeTicket } = await import("../support-tickets");
      mockUpdate.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        closeTicket("ticket_123", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to close ticket");
    });
  });

  describe("getCannedResponses", () => {
    it("should return active canned responses", async () => {
      const { getCannedResponses } = await import("../support-tickets");
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "response_1",
            title: "Welcome",
            content: "Welcome to support!",
            category: "general",
            use_count: 10,
          },
        ],
        error: null,
      });

      const result = await getCannedResponses();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Welcome");
    });

    it("should throw error on database failure", async () => {
      const { getCannedResponses } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getCannedResponses()).rejects.toThrow(
        "Failed to fetch canned responses"
      );
    });
  });

  describe("getSupportTeam", () => {
    it("should return team members", async () => {
      const { getSupportTeam } = await import("../support-tickets");
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "member_1",
            user_id: "user_123",
            email: "agent@example.com",
            name: "Support Agent",
            role: "agent",
            is_available: true,
            max_open_tickets: 10,
            skills: ["billing", "technical"],
          },
        ],
        error: null,
      });

      const result = await getSupportTeam();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("agent@example.com");
      expect(result[0].skills).toEqual(["billing", "technical"]);
    });

    it("should throw error on database failure", async () => {
      const { getSupportTeam } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTeam()).rejects.toThrow("Failed to fetch team");
    });
  });

  describe("addTeamMember", () => {
    it("should add team member", async () => {
      const { addTeamMember } = await import("../support-tickets");
      mockInsert.mockResolvedValue({ error: null });

      await addTeamMember("user_123", "agent@example.com", "Support Agent", "agent");

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user_123",
          email: "agent@example.com",
          name: "Support Agent",
          role: "agent",
        })
      );
    });

    it("should throw error on database failure", async () => {
      const { addTeamMember } = await import("../support-tickets");
      mockInsert.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        addTeamMember("user_123", "agent@example.com", "Agent")
      ).rejects.toThrow("Failed to add team member");
    });
  });

  describe("getSupportAnalytics", () => {
    it("should return analytics data", async () => {
      const { getSupportAnalytics } = await import("../support-tickets");
      mockOrder.mockResolvedValue({
        data: [
          { status: "open", priority: "high", category: "technical" },
          { status: "closed", priority: "low", category: "billing" },
        ],
        error: null,
      });

      const result = await getSupportAnalytics({
        startDate: "2026-03-01",
        endDate: "2026-03-07",
      });

      expect(result.totalTickets).toBe(2);
      expect(result.byStatus).toHaveProperty("open", 1);
      expect(result.byStatus).toHaveProperty("closed", 1);
      expect(result.byPriority).toHaveProperty("high", 1);
      expect(result.byCategory).toHaveProperty("technical", 1);
    });

    it("should throw error on database failure", async () => {
      const { getSupportAnalytics } = await import("../support-tickets");
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(
        getSupportAnalytics({ startDate: "2026-03-01", endDate: "2026-03-07" })
      ).rejects.toThrow("Failed to fetch analytics");
    });
  });
});
