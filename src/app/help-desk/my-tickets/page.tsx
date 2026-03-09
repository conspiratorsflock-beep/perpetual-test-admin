import { Metadata } from "next";
import { getMyTickets } from "@/lib/actions/support-tickets-my";
import { TicketCard } from "@/components/help-desk/my-tickets/TicketCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, AlertCircle, Clock, Zap } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Tickets | Help Desk",
};

interface MyTicketsPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    sla?: string;
  }>;
}

export default async function MyTicketsPage({
  searchParams,
}: MyTicketsPageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;

  const filters = {
    status: params.status?.split(",") as
      | Array<"open" | "pending" | "in_progress" | "resolved" | "closed">
      | undefined,
    priority: params.priority?.split(",") as
      | Array<"low" | "medium" | "high" | "urgent">
      | undefined,
    slaStatus: params.sla?.split(",") as
      | Array<"healthy" | "at_risk" | "breached">
      | undefined,
  };

  // Get tickets assigned to current user
  // Note: In production, you'd map Clerk user to support_team_members
  const tickets = await getMyTickets(user.id, filters);

  const stats = {
    total: tickets.length,
    atRisk: tickets.filter((t) => t.slaStatus === "at_risk").length,
    breached: tickets.filter((t) => t.slaStatus === "breached").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Tickets</h1>
          <p className="text-slate-400">Tickets assigned to you</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.breached > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {stats.breached} SLA Breached
            </Badge>
          )}
          {stats.atRisk > 0 && (
            <Badge
              variant="secondary"
              className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"
            >
              <Clock className="h-3 w-3" />
              {stats.atRisk} At Risk
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-slate-400" />
              <div className="text-2xl font-bold text-slate-100">
                {stats.total}
              </div>
            </div>
            <div className="text-sm text-slate-400">Open Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {stats.breached}
              </div>
            </div>
            <div className="text-sm text-slate-400">SLA Breached</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <div className="text-2xl font-bold text-amber-400">
                {stats.atRisk}
              </div>
            </div>
            <div className="text-sm text-slate-400">At Risk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">
                {stats.urgent}
              </div>
            </div>
            <div className="text-sm text-slate-400">Urgent</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Grid */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <div className="text-slate-400">No tickets assigned to you</div>
            <p className="text-sm text-slate-500 mt-1">
              Check the{" "}
              <a
                href="/help-desk"
                className="text-amber-400 hover:underline"
              >
                Queue
              </a>{" "}
              to pick up tickets
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
