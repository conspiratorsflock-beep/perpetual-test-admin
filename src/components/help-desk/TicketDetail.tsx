"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Paperclip,
  Lock,
} from "lucide-react";
import { ClientDate } from "./ClientDate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getSupportTicketComments,
  addTicketComment,
  updateTicketStatus,
  assignTicket,
  closeTicket,
} from "@/lib/actions/support-tickets";
import type { SupportTicket, SupportTicketComment, TicketStatus, TicketPriority } from "@/types/admin";

interface TicketDetailProps {
  ticket: SupportTicket;
  onBack: () => void;
  onTicketUpdated: () => void;
}

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

export function TicketDetail({ ticket, onBack, onTicketUpdated }: TicketDetailProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<SupportTicketComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [ticket.id]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getSupportTicketComments(ticket.id);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addTicketComment(
        ticket.id,
        newComment,
        user.id,
        user.primaryEmailAddress?.emailAddress || "",
        user.fullName || user.firstName || "Agent",
        isInternal,
        true
      );
      setNewComment("");
      setIsInternal(false);
      await loadComments();
      onTicketUpdated();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!user) return;
    try {
      await updateTicketStatus(
        ticket.id,
        status,
        user.id,
        user.primaryEmailAddress?.emailAddress || ""
      );
      onTicketUpdated();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleAssignToMe = async () => {
    if (!user) return;
    try {
      await assignTicket(
        ticket.id,
        user.id,
        user.primaryEmailAddress?.emailAddress || ""
      );
      onTicketUpdated();
    } catch (error) {
      console.error("Failed to assign ticket:", error);
    }
  };

  const handleCloseTicket = async () => {
    if (!user) return;
    try {
      await closeTicket(
        ticket.id,
        user.id,
        user.primaryEmailAddress?.emailAddress || ""
      );
      onTicketUpdated();
    } catch (error) {
      console.error("Failed to close ticket:", error);
    }
  };

  const isOverdue = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tickets
        </Button>
        <div className="flex items-center gap-2">
          <Select
            value={ticket.status}
            onValueChange={(value) => handleStatusChange(value as TicketStatus)}
          >
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-slate-700">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={handleAssignToMe} className="text-slate-100 focus:bg-slate-700">
                Assign to me
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCloseTicket} className="text-slate-100 focus:bg-slate-700">
                Close ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">
                  {ticket.subject}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>#{ticket.ticketNumber}</span>
                  <span>•</span>
                  <span>{categoryLabels[ticket.category]}</span>
                  <span>•</span>
                  <span>via {ticket.source}</span>
                </div>
              </div>
              <Badge variant="outline" className={statusColors[ticket.status]}>
                {ticket.status.replace("_", " ")}
              </Badge>
            </div>

            <Separator className="my-4 bg-slate-700" />

            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <Tag className="h-4 w-4 text-slate-400" />
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-700 text-slate-300">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No comments yet</div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-4 ${
                      comment.isInternal
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={
                          comment.isAgent ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"
                        }>
                          {comment.authorName?.[0] || comment.authorEmail[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-200">
                            {comment.authorName || comment.authorEmail}
                          </span>
                          {comment.isAgent && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                              Agent
                            </Badge>
                          )}
                          {comment.isInternal && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            <ClientDate date={comment.createdAt} format="datetime" />
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                        
                        {comment.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {comment.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
                              >
                                <Paperclip className="h-3 w-3" />
                                {att.filename}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <Textarea
                placeholder="Type your reply..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 min-h-[100px] mb-4"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                  />
                  <Label htmlFor="internal" className="text-slate-400 text-sm flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Internal note
                  </Label>
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Requester Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Requester</h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-slate-700 text-slate-300">
                  {ticket.userName?.[0] || ticket.userEmail[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-slate-200">
                  {ticket.userName || "Unknown"}
                </div>
                <div className="text-sm text-slate-400">{ticket.userEmail}</div>
              </div>
            </div>
            {ticket.orgId && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-sm text-slate-400">Organization</div>
                <div className="text-slate-300">{ticket.orgId}</div>
              </div>
            )}
          </div>

          {/* Assignment */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Assignment</h4>
            {ticket.assignedTo ? (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-200">Assigned</div>
                  <div className="text-sm text-slate-400">
                    <ClientDate date={ticket.assignedAt} format="date" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 text-sm">Unassigned</span>
                <Button size="sm" variant="outline" onClick={handleAssignToMe} className="border-slate-700">
                  Assign to me
                </Button>
              </div>
            )}
          </div>

          {/* Priority & SLA */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Priority & SLA</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Priority</span>
                <Badge className={priorityColors[ticket.priority]}>
                  {ticket.priority}
                </Badge>
              </div>
              {ticket.slaDeadline && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SLA Deadline</span>
                  <span className={`text-sm ${isOverdue ? "text-red-400" : "text-slate-300"}`}>
                    <ClientDate date={ticket.slaDeadline} format="datetime" />
                  </span>
                </div>
              )}
              {isOverdue && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  SLA breached
                </div>
              )}
            </div>
          </div>

          {/* System Info */}
          {(ticket.browserInfo || ticket.osInfo || ticket.appVersion) && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">System Info</h4>
              <div className="space-y-2 text-sm">
                {ticket.browserInfo && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Browser</span>
                    <span className="text-slate-300">{ticket.browserInfo}</span>
                  </div>
                )}
                {ticket.osInfo && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">OS</span>
                    <span className="text-slate-300">{ticket.osInfo}</span>
                  </div>
                )}
                {ticket.appVersion && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">App Version</span>
                    <span className="text-slate-300">{ticket.appVersion}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Created */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Created</span>
                <span className="text-slate-300">
                  <ClientDate date={ticket.createdAt} format="date" />
                </span>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">First Response</span>
                  <span className="text-slate-300">
                    <ClientDate date={ticket.firstResponseAt} format="date" />
                  </span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolved</span>
                  <span className="text-slate-300">
                    <ClientDate date={ticket.resolvedAt} format="date" />
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
