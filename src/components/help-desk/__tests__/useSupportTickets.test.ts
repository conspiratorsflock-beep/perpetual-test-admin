import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSupportTickets } from "../useSupportTickets";
import * as supportTicketsActions from "@/lib/actions/support-tickets";
import type { SupportTicket } from "@/types/admin";

// Mock the server actions
vi.mock("@/lib/actions/support-tickets", () => ({
  getSupportTickets: vi.fn(),
}));

// Create mock tickets with dates relative to now
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

const mockTickets: SupportTicket[] = [
  {
    id: "ticket_1",
    ticketNumber: 1001,
    userId: "user_1",
    userEmail: "user1@example.com",
    userName: "John Doe",
    orgId: null,
    subject: "Test Ticket 1",
    description: "Description 1",
    category: "technical",
    status: "open",
    priority: "high",
    assignedTo: null,
    assignedAt: null,
    slaDeadline: tomorrow, // Not overdue
    firstResponseAt: null,
    resolvedAt: null,
    source: "web",
    tags: [],
    browserInfo: null,
    osInfo: null,
    appVersion: null,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "ticket_2",
    ticketNumber: 1002,
    userId: "user_2",
    userEmail: "user2@example.com",
    userName: "Jane Smith",
    orgId: null,
    subject: "Test Ticket 2",
    description: "Description 2",
    category: "billing",
    status: "pending",
    priority: "medium",
    assignedTo: "agent_1",
    assignedAt: yesterday,
    slaDeadline: tomorrow, // Not overdue
    firstResponseAt: null,
    resolvedAt: null,
    source: "web",
    tags: [],
    browserInfo: null,
    osInfo: null,
    appVersion: null,
    createdAt: twoDaysAgo,
    updatedAt: yesterday,
  },
  {
    id: "ticket_3",
    ticketNumber: 1003,
    userId: "user_3",
    userEmail: "user3@example.com",
    userName: "Bob Wilson",
    orgId: null,
    subject: "Test Ticket 3",
    description: "Description 3",
    category: "billing",
    status: "closed",
    priority: "low",
    assignedTo: "agent_1",
    assignedAt: twoDaysAgo,
    slaDeadline: yesterday, // Overdue (in the past)
    firstResponseAt: twoDaysAgo,
    resolvedAt: yesterday,
    source: "web",
    tags: [],
    browserInfo: null,
    osInfo: null,
    appVersion: null,
    createdAt: twoDaysAgo,
    updatedAt: yesterday,
  },
];

describe("useSupportTickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch tickets on mount", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tickets).toHaveLength(3);
    expect(result.current.counts.total).toBe(3);
  });

  it("should calculate status counts correctly", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.counts.open).toBe(1);
    expect(result.current.counts.pending).toBe(1);
    expect(result.current.counts.closed).toBe(1);
  });

  it("should calculate unassigned count correctly", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.counts.unassigned).toBe(1);
  });

  it("should calculate overdue count correctly", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only ticket_3 has slaDeadline in the past (yesterday)
    expect(result.current.counts.overdue).toBe(1);
  });

  it("should filter by status 'open'", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: [mockTickets[0]],
      count: 1,
    });

    const { result } = renderHook(() => useSupportTickets({ filter: "open" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["open"],
      })
    );
  });

  it("should filter by status 'pending'", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: [mockTickets[1]],
      count: 1,
    });

    const { result } = renderHook(() => useSupportTickets({ filter: "pending" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["pending"],
      })
    );
  });

  it("should filter unassigned tickets", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: [mockTickets[0]],
      count: 1,
    });

    const { result } = renderHook(() => useSupportTickets({ filter: "unassigned" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        unassigned: true,
      })
    );
  });

  it("should default to active tickets filter", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets({ filter: "all" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["open", "pending", "in_progress", "escalated"],
      })
    );
  });

  it("should pass search query to API", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: [],
      count: 0,
    });

    const { result } = renderHook(() =>
      useSupportTickets({ filter: "all", search: "billing" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "billing",
      })
    );
  });

  it("should refresh tickets when refresh is called", async () => {
    // Use a mutable mock that can be called multiple times
    const mockFn = vi.fn().mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });
    vi.mocked(supportTicketsActions.getSupportTickets).mockImplementation(mockFn);

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial fetch is called twice (once for filtered, once for all tickets count)
    const initialCallCount = mockFn.mock.calls.length;

    // Call refresh
    await result.current.refresh();

    // Should have made additional calls
    expect(mockFn.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it("should handle API errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(supportTicketsActions.getSupportTickets).mockRejectedValue(
      new Error("API Error")
    );

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tickets).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should limit to 100 tickets by default", async () => {
    vi.mocked(supportTicketsActions.getSupportTickets).mockResolvedValue({
      tickets: mockTickets,
      count: 3,
    });

    const { result } = renderHook(() => useSupportTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supportTicketsActions.getSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
      })
    );
  });
});
