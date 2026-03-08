"use client";

import { useState } from "react";
import { 
  Inbox, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  ArrowUpCircle,
  User,
  Search,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { ClientDate } from "./ClientDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/types/admin";

interface TicketListProps {
  tickets: SupportTicket[];
  counts: {
    total: number;
    open: number;
    pending: number;
    inProgress: number;
    resolved: number;
    closed: number;
    escalated: number;
    unassigned: number;
    overdue: number;
  };
  isLoading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  onSelectTicket: (ticket: SupportTicket) => void;
}

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  open: <Inbox className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  closed: <XCircle className="h-4 w-4" />,
  escalated: <ArrowUpCircle className="h-4 w-4" />,
};

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  escalated: "bg-red-500/20 text-red-400 border-red-500/30",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-slate-500/20 text-slate-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

const categoryLabels: Record<string, string> = {
  billing: "Billing",
  account: "Account",
  technical: "Technical",
  feature_request: "Feature Request",
  bug_report: "Bug Report",
  question: "Question",
  other: "Other",
};

export function TicketList({
  tickets,
  counts,
  isLoading,
  filter,
  onFilterChange,
  onSelectTicket,
}: TicketListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filterOptions = [
    { value: "all", label: "All Active", count: counts.open + counts.pending + counts.inProgress + counts.escalated },
    { value: "open", label: "Open", count: counts.open },
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "in_progress", label: "In Progress", count: counts.inProgress },
    { value: "resolved", label: "Resolved", count: counts.resolved },
    { value: "closed", label: "Closed", count: counts.closed },
    { value: "escalated", label: "Escalated", count: counts.escalated },
    { value: "unassigned", label: "Unassigned", count: counts.unassigned },
  ];

  const isOverdue = (ticket: SupportTicket) => {
    return ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-slate-100">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {filterOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-slate-100 focus:bg-slate-700 focus:text-slate-100"
              >
                {option.label}
                <span className="ml-2 text-slate-400">({option.count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              filter === option.value
                ? "bg-slate-700 border-slate-600"
                : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
            }`}
          >
            <div className="text-2xl font-semibold text-slate-100">
              {option.count}
            </div>
            <div className="text-xs text-slate-400">{option.label}</div>
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400">Ticket</TableHead>
              <TableHead className="text-slate-400">Requester</TableHead>
              <TableHead className="text-slate-400">Subject</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Priority</TableHead>
              <TableHead className="text-slate-400">Category</TableHead>
              <TableHead className="text-slate-400">Assigned</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="text-slate-400 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                  Loading tickets...
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="border-slate-700 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => onSelectTicket(ticket)}
                >
                  <TableCell className="font-medium text-slate-200">
                    #{ticket.ticketNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-200">{ticket.userName || ticket.userEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-slate-200">
                      {ticket.subject}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusColors[ticket.status]} flex items-center gap-1`}
                    >
                      {statusIcons[ticket.status]}
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-400 text-sm">
                      {categoryLabels[ticket.category]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ticket.assignedTo ? (
                      <span className="text-slate-300 text-sm">Assigned</span>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-slate-300 text-sm">
                        <ClientDate date={ticket.createdAt} />
                      </span>
                      {isOverdue(ticket) && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem
                          className="text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(ticket);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
