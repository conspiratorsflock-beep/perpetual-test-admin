"use client";

import { SupportTicketWithAssignee } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface TicketCardProps {
  ticket: SupportTicketWithAssignee;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const slaColor = {
    healthy: "text-green-500",
    at_risk: "text-amber-500",
    breached: "text-red-500",
  }[ticket.slaStatus];

  const slaBg = {
    healthy: "bg-green-500/10",
    at_risk: "bg-amber-500/10",
    breached: "bg-red-500/10",
  }[ticket.slaStatus];

  const priorityColor = {
    low: "bg-slate-500",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  }[ticket.priority];

  const formatSLA = (minutes: number) => {
    if (minutes < 0) return "Overdue";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const statusColors: Record<string, string> = {
    open: "border-blue-500 text-blue-400",
    pending: "border-amber-500 text-amber-400",
    in_progress: "border-purple-500 text-purple-400",
    resolved: "border-green-500 text-green-400",
    closed: "border-slate-500 text-slate-400",
    escalated: "border-red-500 text-red-400",
  };

  return (
    <Card
      className={`group hover:border-amber-500/50 transition-colors ${
        ticket.slaStatus === "breached" ? "border-red-500/30" : ""
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-400">
              #{ticket.ticketNumber}
            </span>
            <Badge
              className={`${priorityColor} text-white text-xs capitalize`}
            >
              {ticket.priority}
            </Badge>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded ${slaBg}`}
          >
            {ticket.slaStatus === "breached" ? (
              <AlertCircle className={`h-3 w-3 ${slaColor}`} />
            ) : (
              <Clock className={`h-3 w-3 ${slaColor}`} />
            )}
            <span className={`text-xs font-medium ${slaColor}`}>
              {formatSLA(ticket.slaMinutesRemaining)}
            </span>
          </div>
        </div>

        {/* Subject */}
        <h3 className="font-medium text-slate-100 line-clamp-2 group-hover:text-amber-400 transition-colors">
          {ticket.subject}
        </h3>

        {/* Requester */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <User className="h-3 w-3" />
          <span className="truncate">
            {ticket.userName || ticket.userEmail}
          </span>
        </div>

        {/* Category & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">
            {ticket.category.replace("_", " ")}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs capitalize ${
              statusColors[ticket.status] || ""
            }`}
          >
            {ticket.status.replace("_", " ")}
          </Badge>
          {ticket.autoAssigned && (
            <Badge
              variant="outline"
              className="text-xs text-purple-400 border-purple-500/30"
            >
              Auto
            </Badge>
          )}
        </div>

        {/* Recent Comments */}
        {ticket.recentComments && ticket.recentComments.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {ticket.recentComments.slice(0, 2).map((comment) => (
              <div
                key={comment.id}
                className={`text-sm p-2 rounded ${
                  comment.isInternal
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      comment.isInternal
                        ? "text-amber-400"
                        : comment.isAgent
                        ? "text-blue-400"
                        : "text-slate-400"
                    }`}
                  >
                    {comment.isInternal
                      ? "Internal Note"
                      : comment.isAgent
                      ? "Agent"
                      : "Customer"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-slate-300 line-clamp-2 text-xs">
                  {comment.content}
                </p>
              </div>
            ))}
            {ticket.recentComments.length > 2 && (
              <p className="text-xs text-slate-500 text-center">
                +{ticket.recentComments.length - 2} more comments
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/help-desk?t=${ticket.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Ticket
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
