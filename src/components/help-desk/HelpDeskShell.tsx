"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { TicketList } from "./TicketList";
import { TicketDetail } from "./TicketDetail";
import { TeamView } from "./TeamView";
import { CannedResponsesView } from "./CannedResponsesView";
import { SupportAnalytics } from "./SupportAnalytics";
import { useSupportTickets } from "./useSupportTickets";
import type { SupportTicket } from "@/types/admin";

export function HelpDeskShell() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketFilter, setTicketFilter] = useState<string>("all");

  const { tickets, counts, isLoading, lastUpdated, refresh } = useSupportTickets({
    filter: ticketFilter,
  });

  // Use a ref to store the refresh function to avoid dependency issues
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Auto-refresh every 30 seconds when on tickets tab
  useEffect(() => {
    if (activeTab !== "tickets") {
      return;
    }
    
    const interval = setInterval(() => {
      refreshRef.current();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setActiveTab("detail");
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setActiveTab("tickets");
  };

  const handleTicketUpdated = () => {
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Help Desk</h1>
          <p className="text-slate-400 mt-1">
            Manage support tickets and customer inquiries
            {lastUpdated && (
              <span className="ml-2 text-xs">
                (updated {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="border-slate-700 text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger
            value="tickets"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Tickets
            {counts.total > 0 && (
              <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                {counts.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="detail"
            disabled={!selectedTicket}
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Detail
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Team
          </TabsTrigger>
          <TabsTrigger
            value="responses"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Responses
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {activeTab === "tickets" && (
            <TicketList
              tickets={tickets}
              counts={counts}
              isLoading={isLoading}
              filter={ticketFilter}
              onFilterChange={setTicketFilter}
              onSelectTicket={handleTicketSelect}
            />
          )}

          {activeTab === "detail" && selectedTicket && (
            <TicketDetail
              ticket={selectedTicket}
              onBack={handleBackToList}
              onTicketUpdated={handleTicketUpdated}
            />
          )}

          {activeTab === "team" && <TeamView />}

          {activeTab === "responses" && <CannedResponsesView />}

          {activeTab === "analytics" && <SupportAnalytics />}
        </div>
      </Tabs>
    </div>
  );
}
