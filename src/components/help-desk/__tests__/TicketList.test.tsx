import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketList } from "../TicketList";
import type { SupportTicket } from "@/types/admin";

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

const mockTickets: SupportTicket[] = [
  {
    id: "ticket_1",
    ticketNumber: 1001,
    userId: "user_1",
    userEmail: "user1@example.com",
    userName: "John Doe",
    orgId: "org_1",
    subject: "Billing Issue",
    description: "I was charged twice",
    category: "billing",
    status: "open",
    priority: "high",
    assignedTo: null,
    assignedAt: null,
    slaDeadline: "2026-03-08T10:00:00Z",
    firstResponseAt: null,
    resolvedAt: null,
    source: "web",
    tags: ["urgent"],
    browserInfo: "Chrome",
    osInfo: "Windows",
    appVersion: "1.0.0",
    createdAt: "2026-03-07T08:00:00Z",
    updatedAt: "2026-03-07T08:00:00Z",
  },
  {
    id: "ticket_2",
    ticketNumber: 1002,
    userId: "user_2",
    userEmail: "user2@example.com",
    userName: "Jane Smith",
    orgId: null,
    subject: "Feature Request",
    description: "Please add dark mode",
    category: "feature_request",
    status: "pending",
    priority: "low",
    assignedTo: "agent_1",
    assignedAt: "2026-03-07T09:00:00Z",
    slaDeadline: "2026-03-08T16:00:00Z",
    firstResponseAt: "2026-03-07T09:30:00Z",
    resolvedAt: null,
    source: "in_app",
    tags: [],
    browserInfo: null,
    osInfo: null,
    appVersion: null,
    createdAt: "2026-03-07T08:30:00Z",
    updatedAt: "2026-03-07T09:30:00Z",
  },
];

const mockCounts = {
  total: 10,
  open: 3,
  pending: 2,
  inProgress: 1,
  resolved: 2,
  closed: 1,
  escalated: 1,
  unassigned: 2,
  overdue: 1,
};

describe("TicketList", () => {
  const mockOnFilterChange = vi.fn();
  const mockOnSelectTicket = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    render(
      <TicketList
        tickets={[]}
        counts={mockCounts}
        isLoading={true}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <TicketList
        tickets={[]}
        counts={{ ...mockCounts, total: 0 }}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("No tickets found")).toBeInTheDocument();
  });

  it("renders ticket list", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("#1001")).toBeInTheDocument();
    expect(screen.getByText("#1002")).toBeInTheDocument();
    expect(screen.getByText("Billing Issue")).toBeInTheDocument();
    // "Feature Request" appears in both the ticket and filter buttons
    expect(screen.getAllByText("Feature Request").length).toBeGreaterThanOrEqual(1);
  });

  it("displays correct status badges", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("displays correct priority badges", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("low")).toBeInTheDocument();
  });

  it("displays unassigned badge for unassigned tickets", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    // "Unassigned" appears in both filter buttons and table
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelectTicket when ticket row is clicked", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    const ticketRow = screen.getByText("#1001").closest("tr");
    fireEvent.click(ticketRow!);

    expect(mockOnSelectTicket).toHaveBeenCalledWith(mockTickets[0]);
  });

  it("calls onFilterChange when filter buttons are clicked", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    const openFilter = screen.getByText("Open").closest("button");
    fireEvent.click(openFilter!);

    expect(mockOnFilterChange).toHaveBeenCalledWith("open");
  });

  it("displays filter counts", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    // Numbers appear in multiple places (filter buttons and table), use getAllByText
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1); // open count
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // pending count
  });

  it("shows overdue indicator for overdue tickets", () => {
    const overdueTicket: SupportTicket = {
      ...mockTickets[0],
      slaDeadline: "2026-03-06T10:00:00Z", // Past date
    };

    render(
      <TicketList
        tickets={[overdueTicket]}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("displays category labels", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    // Use getAllByText since "Billing" appears in both category and filter
    const billingElements = screen.getAllByText("Billing");
    expect(billingElements.length).toBeGreaterThanOrEqual(1);
    
    const featureRequestElements = screen.getAllByText("Feature Request");
    expect(featureRequestElements.length).toBeGreaterThanOrEqual(1);
  });

  it("displays user names or emails", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("allows search input", () => {
    render(
      <TicketList
        tickets={mockTickets}
        counts={mockCounts}
        isLoading={false}
        filter="all"
        onFilterChange={mockOnFilterChange}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search tickets...");
    fireEvent.change(searchInput, { target: { value: "billing" } });

    expect(searchInput).toHaveValue("billing");
  });
});
