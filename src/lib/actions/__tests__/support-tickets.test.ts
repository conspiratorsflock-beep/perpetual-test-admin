import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Supabase - define everything inside the factory
vi.mock("@/lib/supabase/admin", () => {
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
  const mockGte = vi.fn();
  const mockLte = vi.fn();

  // Setup default chain behavior
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    is: mockIs,
    or: mockOr,
    order: mockOrder,
    range: mockRange,
    gte: mockGte,
    lte: mockLte,
  });

  mockEq.mockReturnValue({
    eq: mockEq,
    is: mockIs,
    single: mockSingle,
    order: mockOrder,
    range: mockRange,
    gte: mockGte,
    lte: mockLte,
  });

  mockIn.mockReturnValue({
    is: mockIs,
    order: mockOrder,
    range: mockRange,
  });

  mockIs.mockReturnValue({
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
  });

  mockOr.mockReturnValue({
    order: mockOrder,
    range: mockRange,
  });

  mockGte.mockReturnValue({
    lte: mockLte,
    order: mockOrder,
  });

  // mockLte needs to support both chaining to order() and being awaited directly
  // When used as .gte().lte().order() - it returns order
  // When used as .gte().lte() and awaited - it returns a promise
  const lteReturnValue = {
    order: mockOrder,
    then: (resolve: (value: any) => void) => resolve({ data: [], error: null }),
  };
  mockLte.mockReturnValue(lteReturnValue);

  mockUpdate.mockReturnValue({
    eq: mockEq,
  });

  mockInsert.mockReturnValue({
    select: mockSelect,
  });

  // order() should return the chain for further chaining (e.g., .range())
  // and also be thenable for when the query is executed
  const orderReturnValue = {
    range: mockRange,
    then: (resolve: (value: any) => void) => resolve({ data: [], error: null }),
  };
  mockOrder.mockReturnValue(orderReturnValue);
  mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
  mockSingle.mockResolvedValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: mockFrom,
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    // Export mocks for test access
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockEq,
    mockIn,
    mockIs,
    mockOr,
    mockOrder,
    mockRange,
    mockSingle,
    mockFrom,
    mockGte,
    mockLte,
  };
});

// Import the mocked module and functions
import {
  getSupportTickets,
  getSupportTicketById,
  getSupportTicketComments,
  getSupportTicketEvents,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  addTicketComment,
  closeTicket,
  getCannedResponses,
  getSupportTeam,
  addTeamMember,
  getSupportAnalytics,
} from "../support-tickets";
import {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockIn,
  mockIs,
  mockOr,
  mockOrder,
  mockRange,
  mockSingle,
  mockFrom,
  mockGte,
  mockLte,
} from "@/lib/supabase/admin";

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
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      or: mockOr,
      order: mockOrder,
      range: mockRange,
      gte: mockGte,
      lte: mockLte,
    });
    
    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      single: mockSingle,
      order: mockOrder,
      range: mockRange,
      gte: mockGte,
      lte: mockLte,
    });
    
    mockIn.mockReturnValue({
      is: mockIs,
      order: mockOrder,
      range: mockRange,
    });
    
    mockIs.mockReturnValue({
      order: mockOrder,
      range: mockRange,
      single: mockSingle,
    });
    
    mockOr.mockReturnValue({
      order: mockOrder,
      range: mockRange,
    });
    
    mockGte.mockReturnValue({
      lte: mockLte,
      order: mockOrder,
    });
    
    // mockLte supports both chaining and being awaited
    mockLte.mockReturnValue({
      order: mockOrder,
      then: (resolve: (value: any) => void) => resolve({ data: [], error: null }),
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    
    // order() should return the chain for further chaining (e.g., .range())
    mockOrder.mockReturnValue({
      range: mockRange,
      then: (resolve: (value: any) => void) => resolve({ data: [], error: null }),
    });
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  describe("getSupportTickets", () => {
    it("should return tickets with count", async () => {
      mockRange.mockResolvedValue({ data: [mockTicket], error: null, count: 1 });

      const result = await getSupportTickets();

      expect(result.tickets).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.tickets[0].id).toBe("ticket_123");
    });

    it("should throw error on database failure", async () => {
      mockRange.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTickets()).rejects.toThrow("Failed to fetch tickets");
    });
  });

  describe("getSupportTicketById", () => {
    it("should return ticket by id", async () => {
      mockSingle.mockResolvedValue({ data: mockTicket, error: null });

      const result = await getSupportTicketById("ticket_123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("ticket_123");
    });

    it("should return null for non-existent ticket", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await getSupportTicketById("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketById("ticket_123")).rejects.toThrow(
        "Failed to fetch ticket"
      );
    });
  });

  describe("getSupportTicketComments", () => {
    it("should return comments for ticket", async () => {
      mockOrder.mockResolvedValue({ data: [mockComment], error: null });

      const result = await getSupportTicketComments("ticket_123");

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("This is a reply");
    });

    it("should throw error on database failure", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketComments("ticket_123")).rejects.toThrow(
        "Failed to fetch comments"
      );
    });
  });

  describe("getSupportTicketEvents", () => {
    it("should return events for ticket", async () => {
      mockOrder.mockResolvedValue({ data: [mockEvent], error: null });

      const result = await getSupportTicketEvents("ticket_123");

      expect(result).toHaveLength(1);
      // Note: The function returns raw DB data with snake_case, not camelCase
      expect(result[0].event_type).toBe("created");
    });

    it("should throw error on database failure", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTicketEvents("ticket_123")).rejects.toThrow(
        "Failed to fetch events"
      );
    });
  });

  describe("assignTicket", () => {
    it("should assign ticket to agent", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await assignTicket("ticket_123", "agent_123", "agent@example.com");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to: "agent_123",
          status: "in_progress",
        })
      );
    });

    it("should throw error on database failure", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        assignTicket("ticket_123", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to assign ticket");
    });
  });

  describe("updateTicketStatus", () => {
    it("should update ticket status", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

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
    });

    it("should throw error on database failure", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        updateTicketStatus("ticket_123", "closed", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to update ticket status");
    });
  });

  describe("updateTicketPriority", () => {
    it("should update ticket priority and recalculate SLA", async () => {
      // First query: select().eq().single() to get ticket
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { created_at: "2026-03-07T10:00:00Z" }, error: null });
      
      // Second query: update().eq() to update ticket
      mockUpdate.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });

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
      // First query: select().eq().single() to get ticket
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { created_at: "2026-03-07T10:00:00Z" }, error: null });
      
      // Second query: update().eq() - make eq return error
      mockUpdate.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: { message: "Database error" } });

      await expect(
        updateTicketPriority("ticket_123", "urgent", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to update priority");
    });
  });

  describe("addTicketComment", () => {
    it("should add public comment", async () => {
      // First query: insert().select().single() to add comment
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: mockComment, error: null });
      
      // Second query (internal): select().eq().single() to get ticket status
      // Since isAgent=true and isInternal=false, it checks ticket status
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: { status: "open" }, error: null });
      // Ticket status is "open", not "pending", so no update query is made

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
      // For the insert chain: insert().select().single()
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Database error" } });

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
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await closeTicket("ticket_123", "agent_123", "agent@example.com", "Resolved");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "closed",
          resolved_at: expect.any(String),
        })
      );
    });

    it("should throw error on database failure", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        closeTicket("ticket_123", "agent_123", "agent@example.com")
      ).rejects.toThrow("Failed to close ticket");
    });
  });

  describe("getCannedResponses", () => {
    it("should return active canned responses", async () => {
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
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getCannedResponses()).rejects.toThrow(
        "Failed to fetch canned responses"
      );
    });
  });

  describe("getSupportTeam", () => {
    it("should return team members", async () => {
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
      mockOrder.mockResolvedValue({ data: null, error: { message: "Database error" } });

      await expect(getSupportTeam()).rejects.toThrow("Failed to fetch team");
    });
  });

  describe("addTeamMember", () => {
    it("should add team member", async () => {
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
      mockInsert.mockResolvedValue({ error: { message: "Database error" } });

      await expect(
        addTeamMember("user_123", "agent@example.com", "Agent")
      ).rejects.toThrow("Failed to add team member");
    });
  });

  describe("getSupportAnalytics", () => {
    it("should return analytics data", async () => {
      // Make lte return data when awaited (since getSupportAnalytics ends with .lte())
      mockLte.mockReturnValue({
        order: mockOrder,
        then: (resolve: (value: any) => void) => resolve({
          data: [
            { status: "open", priority: "high", category: "technical" },
            { status: "closed", priority: "low", category: "billing" },
          ],
          error: null,
        }),
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
      // Make lte return an error when awaited
      mockLte.mockReturnValue({
        order: mockOrder,
        then: (resolve: (value: any) => void) => resolve({ data: null, error: { message: "Database error" } }),
      });

      await expect(
        getSupportAnalytics({ startDate: "2026-03-01", endDate: "2026-03-07" })
      ).rejects.toThrow("Failed to fetch analytics");
    });
  });
});
