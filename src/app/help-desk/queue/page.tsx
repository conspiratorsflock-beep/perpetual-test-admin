"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox, AlertCircle, Clock, Users } from "lucide-react";
import { TicketList } from "@/components/help-desk/TicketList";
import { SeedTicketsButton } from "@/components/help-desk/queue/SeedTicketsButton";
import { useSupportTickets } from "@/components/help-desk/useSupportTickets";
import { getSupportTicketById } from "@/lib/actions/support-tickets";
import type { SupportTicket } from "@/types/admin";
import Link from "next/link";

export default function QueuePage() {
  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  const { tickets, counts, isLoading, lastUpdated, refresh } =
    useSupportTickets({
      filter: ticketFilter,
    });

  // Use a ref to store the refresh function to avoid dependency issues
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRef.current();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdated = async () => {
    await refresh();
    if (selectedTicket) {
      const updated = await getSupportTicketById(selectedTicket.id);
      if (updated) {
        setSelectedTicket(updated);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Ticket Queue</h1>
          <p className="text-slate-400">
            All tickets, filtering, and bulk operations
            {lastUpdated && (
              <span className="ml-2 text-xs">
                (updated {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeedTicketsButton />
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/help-desk">
            <Button size="sm">New Ticket</Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-slate-400" />
              <div className="text-2xl font-bold text-slate-100">
                {counts.open}
              </div>
            </div>
            <div className="text-sm text-slate-400">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <div className="text-2xl font-bold text-amber-400">
                {counts.pending}
              </div>
            </div>
            <div className="text-sm text-slate-400">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {counts.escalated}
              </div>
            </div>
            <div className="text-sm text-slate-400">Escalated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">
                {counts.unassigned}
              </div>
            </div>
            <div className="text-sm text-slate-400">Unassigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <div className="text-2xl font-bold text-red-500">
                {counts.overdue}
              </div>
            </div>
            <div className="text-sm text-slate-400">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket List */}
      <TicketList
        tickets={tickets}
        counts={counts}
        isLoading={isLoading}
        filter={ticketFilter}
        onFilterChange={setTicketFilter}
        onSelectTicket={handleTicketSelect}
        showBulkActions={true}
      />
    </div>
  );
}

// Simple Card components for the stats
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">{children}</div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
