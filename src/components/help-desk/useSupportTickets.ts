"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupportTickets } from "@/lib/actions/support-tickets";
import type { SupportTicket } from "@/types/admin";

interface TicketCounts {
  total: number;
  open: number;
  pending: number;
  inProgress: number;
  resolved: number;
  closed: number;
  escalated: number;
  unassigned: number;
  overdue: number;
}

interface UseSupportTicketsOptions {
  filter?: string;
  search?: string;
}

export function useSupportTickets(options: UseSupportTicketsOptions = {}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    escalated: 0,
    unassigned: 0,
    overdue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      let status: string[] | undefined;
      let unassigned: boolean | undefined;

      switch (options.filter) {
        case "open":
          status = ["open"];
          break;
        case "pending":
          status = ["pending"];
          break;
        case "in_progress":
          status = ["in_progress"];
          break;
        case "resolved":
          status = ["resolved"];
          break;
        case "closed":
          status = ["closed"];
          break;
        case "escalated":
          status = ["escalated"];
          break;
        case "unassigned":
          unassigned = true;
          break;
        case "all":
        default:
          status = ["open", "pending", "in_progress", "escalated"];
      }

      // Fetch filtered tickets for display
      const { tickets: data, count } = await getSupportTickets({
        status,
        unassigned,
        search: options.search,
        limit: 100,
      });

      setTickets(data);

      // Fetch ALL tickets for accurate counts (regardless of filter)
      const { tickets: allTickets } = await getSupportTickets({
        limit: 1000, // Get all tickets for counting
      });

      // Calculate counts from ALL tickets
      const newCounts: TicketCounts = {
        total: allTickets.length,
        open: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        escalated: 0,
        unassigned: 0,
        overdue: 0,
      };

      allTickets.forEach((ticket) => {
        switch (ticket.status) {
          case "open":
            newCounts.open++;
            break;
          case "pending":
            newCounts.pending++;
            break;
          case "in_progress":
            newCounts.inProgress++;
            break;
          case "resolved":
            newCounts.resolved++;
            break;
          case "closed":
            newCounts.closed++;
            break;
          case "escalated":
            newCounts.escalated++;
            break;
        }

        if (!ticket.assignedTo) {
          newCounts.unassigned++;
        }

        if (ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date()) {
          newCounts.overdue++;
        }
      });

      setCounts(newCounts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [options.filter, options.search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    counts,
    isLoading,
    lastUpdated,
    refresh: fetchTickets,
  };
}
