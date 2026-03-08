import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetail } from "../TicketDetail";
import * as supportTicketsActions from "@/lib/actions/support-tickets";
import type { SupportTicket } from "@/types/admin";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      id: "agent_123",
      primaryEmailAddress: { emailAddress: "agent@example.com" },
      fullName: "Support Agent",
    },
  }),
}));

// Mock server actions
vi.mock("@/lib/actions/support-tickets", () => ({
  getSupportTicketComments: vi.fn(),
  addTicketComment: vi.fn(),
  updateTicketStatus: vi.fn(),
  assignTicket: vi.fn(),
  closeTicket: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: (date: string, formatStr: string) => "Mar 7, 2026",
}));

const mockTicket: SupportTicket = {
  id: "ticket_123",
  ticketNumber: 1001,
  userId: "user_123",
  userEmail: "user@example.com",
  userName: "John Doe",
  orgId: "org_123",
  subject: "Test Ticket Subject",
  description: "This is the ticket description",
  category: "technical",
  status: "open",
  priority: "high",
  assignedTo: null,
  assignedAt: null,
  slaDeadline: "2026-03-08T10:00:00Z",
  firstResponseAt: null,
  resolvedAt: null,
  source: "web",
  tags: ["bug", "urgent"],
  browserInfo: "Chrome 120",
  osInfo: "macOS",
  appVersion: "1.0.0",
  createdAt: "2026-03-07T10:00:00Z",
  updatedAt: "2026-03-07T10:00:00Z",
};

const mockComments = [
  {
    id: "comment_1",
    ticketId: "ticket_123",
    authorId: "user_123",
    authorEmail: "user@example.com",
    authorName: "John Doe",
    isAgent: false,
    isInternal: false,
    content: "Original ticket description",
    attachments: [],
    createdAt: "2026-03-07T10:00:00Z",
    editedAt: null,
  },
  {
    id: "comment_2",
    ticketId: "ticket_123",
    authorId: "agent_123",
    authorEmail: "agent@example.com",
    authorName: "Support Agent",
    isAgent: true,
    isInternal: false,
    content: "I'll help you with this issue",
    attachments: [],
    createdAt: "2026-03-07T11:00:00Z",
    editedAt: null,
  },
];

describe("TicketDetail", () => {
  const mockOnBack = vi.fn();
  const mockOnTicketUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supportTicketsActions.getSupportTicketComments).mockResolvedValue(
      mockComments
    );
    vi.mocked(supportTicketsActions.addTicketComment).mockResolvedValue({
      ...mockComments[0],
      id: "comment_3",
    });
    vi.mocked(supportTicketsActions.updateTicketStatus).mockResolvedValue();
    vi.mocked(supportTicketsActions.assignTicket).mockResolvedValue();
    vi.mocked(supportTicketsActions.closeTicket).mockResolvedValue();
  });

  it("renders ticket details", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Ticket Subject")).toBeInTheDocument();
    });

    expect(screen.getByText("#1001")).toBeInTheDocument();
    // Category is displayed as "Technical" (capitalized via categoryLabels)
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("via web")).toBeInTheDocument();
  });

  it("renders ticket description", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("This is the ticket description")
      ).toBeInTheDocument();
    });
  });

  it("renders comments", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Conversation")).toBeInTheDocument();
    });

    // Names appear in multiple places
    expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Support Agent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("I'll help you with this issue")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    const backButton = screen.getByText("Back to tickets");
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it("displays requester info", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Requester")).toBeInTheDocument();
    });

    // Name appears in multiple places, use getAllByText
    expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("displays unassigned status", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Assignment")).toBeInTheDocument();
    });

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("displays priority badge", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Priority & SLA")).toBeInTheDocument();
    });

    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("displays system info", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("System Info")).toBeInTheDocument();
    });

    expect(screen.getByText("Chrome 120")).toBeInTheDocument();
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
  });

  it("allows adding a comment", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    const textarea = screen.getByPlaceholderText("Type your reply...");
    fireEvent.change(textarea, { target: { value: "New comment" } });

    const sendButton = screen.getByText("Send Reply");
    fireEvent.click(sendButton);

    // Verify the action was called
    expect(supportTicketsActions.addTicketComment).toHaveBeenCalled();
  });

  it("allows adding internal note", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    const internalSwitch = screen.getByLabelText("Internal note");
    fireEvent.click(internalSwitch);

    const textarea = screen.getByPlaceholderText("Type your reply...");
    fireEvent.change(textarea, { target: { value: "Internal note content" } });

    const sendButton = screen.getByText("Send Reply");
    fireEvent.click(sendButton);

    // Verify the action was called (may need to wait for async)
    expect(supportTicketsActions.addTicketComment).toHaveBeenCalled();
  });

  it("allows assigning ticket to self", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Assign to me")).toBeInTheDocument();
    });

    const assignButton = screen.getByText("Assign to me");
    fireEvent.click(assignButton);

    // Verify the action was called
    expect(supportTicketsActions.assignTicket).toHaveBeenCalled();
  });

  it("has status selector", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    // Status selector should be present (combobox role)
    const statusSelector = screen.getByRole("combobox");
    expect(statusSelector).toBeInTheDocument();
  });

  it("displays tags", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("bug")).toBeInTheDocument();
    });

    expect(screen.getByText("urgent")).toBeInTheDocument();
  });

  it("displays timeline information", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Timeline")).toBeInTheDocument();
    });

    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("displays agent badge on agent comments", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
    });
  });

  it("disables send button when comment is empty", async () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    const sendButton = screen.getByText("Send Reply");
    expect(sendButton).toBeDisabled();
  });

  it("shows loading state for comments", () => {
    vi.mocked(supportTicketsActions.getSupportTicketComments).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TicketDetail
        ticket={mockTicket}
        onBack={mockOnBack}
        onTicketUpdated={mockOnTicketUpdated}
      />
    );

    expect(screen.getByText("Loading comments...")).toBeInTheDocument();
  });
});
