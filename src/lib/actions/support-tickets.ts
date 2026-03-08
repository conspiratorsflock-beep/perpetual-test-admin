"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import type { SupportTicket, SupportTicketComment, SupportTicketEvent, TicketCategory, TicketStatus, TicketPriority } from "@/types/admin";

// ============================================
// Ticket Queries
// ============================================

export async function getSupportTickets(params: {
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedTo?: string;
  unassigned?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ tickets: SupportTicket[]; count: number }> {
  let query = supabaseAdmin
    .from("support_tickets")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.status?.length) {
    query = query.in("status", params.status);
  }
  if (params.priority?.length) {
    query = query.in("priority", params.priority);
  }
  if (params.category?.length) {
    query = query.in("category", params.category);
  }
  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }
  if (params.unassigned) {
    query = query.is("assigned_to", null);
  }
  if (params.search) {
    query = query.or(
      `subject.ilike.%${params.search}%,description.ilike.%${params.search}%,user_email.ilike.%${params.search}%`
    );
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }

  return {
    tickets: (data || []).map(mapTicketFromDB),
    count: count || 0,
  };
}

export async function getSupportTicketById(id: string): Promise<SupportTicket | null> {
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }

  return data ? mapTicketFromDB(data) : null;
}

export async function getSupportTicketComments(ticketId: string): Promise<SupportTicketComment[]> {
  const { data, error } = await supabaseAdmin
    .from("support_ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return (data || []).map(mapCommentFromDB);
}

export async function getSupportTicketEvents(ticketId: string): Promise<SupportTicketEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("support_ticket_events")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return data || [];
}

// ============================================
// Ticket Actions
// ============================================

export async function assignTicket(
  ticketId: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      assigned_to: agentId,
      assigned_at: new Date().toISOString(),
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to assign ticket: ${error.message}`);
  }

  // Log event
  await logTicketEvent(ticketId, "assigned", null, agentId, agentEmail);

  // Audit log
  await logAdminAction({
    action: "support_ticket.assign",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: { assignedTo: agentId },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  const updates: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set timestamps based on status
  if (status === "resolved") {
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to update ticket status: ${error.message}`);
  }

  await logTicketEvent(ticketId, "status_changed", status, agentId, agentEmail);

  await logAdminAction({
    action: "support_ticket.status_change",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: { status },
  });
}

export async function updateTicketPriority(
  ticketId: string,
  priority: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  // Recalculate SLA deadline
  const { data: ticket } = await supabaseAdmin
    .from("support_tickets")
    .select("created_at")
    .eq("id", ticketId)
    .single();

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      priority,
      sla_deadline: ticket ? calculateSLADeadline(priority, ticket.created_at) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to update priority: ${error.message}`);
  }

  await logTicketEvent(ticketId, "priority_changed", priority, agentId, agentEmail);
}

export async function addTicketComment(
  ticketId: string,
  content: string,
  authorId: string,
  authorEmail: string,
  authorName: string,
  isInternal: boolean = false,
  isAgent: boolean = true,
  attachments: Array<{ filename: string; url: string; mimeType: string; size: number }> = []
): Promise<SupportTicketComment> {
  const { data, error } = await supabaseAdmin
    .from("support_ticket_comments")
    .insert({
      ticket_id: ticketId,
      author_id: authorId,
      author_email: authorEmail,
      author_name: authorName,
      is_agent: isAgent,
      is_internal: isInternal,
      content,
      attachments,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  // Update ticket status if agent replies to pending ticket
  if (isAgent && !isInternal) {
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("status")
      .eq("id", ticketId)
      .single();

    if (ticket?.status === "pending") {
      await supabaseAdmin
        .from("support_tickets")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", ticketId);
    }
  }

  await logTicketEvent(ticketId, "comment_added", null, authorId, authorEmail);

  return mapCommentFromDB(data);
}

export async function closeTicket(
  ticketId: string,
  agentId: string,
  agentEmail: string,
  resolution?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      status: "closed",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to close ticket: ${error.message}`);
  }

  await logTicketEvent(ticketId, "closed", resolution || null, agentId, agentEmail);

  await logAdminAction({
    action: "support_ticket.close",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: { resolution },
  });
}

// ============================================
// Canned Responses
// ============================================

export async function getCannedResponses(category?: string): Promise<Array<{
  id: string;
  title: string;
  content: string;
  category: string | null;
}>> {
  let query = supabaseAdmin
    .from("support_canned_responses")
    .select("*")
    .eq("is_active", true)
    .order("use_count", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch canned responses: ${error.message}`);
  }

  return data || [];
}

export async function incrementCannedResponseUse(id: string): Promise<void> {
  await supabaseAdmin.rpc("increment", { table_name: "support_canned_responses", id });
}

// ============================================
// Team Management
// ============================================

export async function getSupportTeam(): Promise<Array<{
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isAvailable: boolean;
  maxOpenTickets: number;
  skills: string[];
}>> {
  const { data, error } = await supabaseAdmin
    .from("support_team_members")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch team: ${error.message}`);
  }

  return (data || []).map((member) => ({
    id: member.id,
    userId: member.user_id,
    email: member.email,
    name: member.name,
    role: member.role,
    isAvailable: member.is_available,
    maxOpenTickets: member.max_open_tickets,
    skills: member.skills || [],
  }));
}

export async function addTeamMember(
  userId: string,
  email: string,
  name: string | null,
  role: string = "agent"
): Promise<void> {
  const { error } = await supabaseAdmin.from("support_team_members").insert({
    user_id: userId,
    email,
    name,
    role,
  });

  if (error) {
    throw new Error(`Failed to add team member: ${error.message}`);
  }
}

// ============================================
// Analytics
// ============================================

export async function getSupportAnalytics(params: {
  startDate: string;
  endDate: string;
}): Promise<{
  totalTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number | null;
}> {
  // This would be implemented with more complex aggregations
  // For now, return basic counts
  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("status, priority, category, first_response_at, resolved_at, created_at")
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  tickets?.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  return {
    totalTickets: tickets?.length || 0,
    byStatus,
    byPriority,
    byCategory,
    avgResponseTime: 0, // TODO: Calculate
    avgResolutionTime: 0, // TODO: Calculate
    satisfactionScore: null, // TODO: Implement CSAT
  };
}

// ============================================
// Helpers
// ============================================

function mapTicketFromDB(row: Record<string, unknown>): SupportTicket {
  return {
    id: row.id as string,
    ticketNumber: row.ticket_number as number,
    userId: row.user_id as string,
    userEmail: row.user_email as string,
    userName: row.user_name as string | null,
    orgId: row.org_id as string | null,
    subject: row.subject as string,
    description: row.description as string,
    category: row.category as TicketCategory,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    assignedTo: row.assigned_to as string | null,
    assignedAt: row.assigned_at as string | null,
    slaDeadline: row.sla_deadline as string | null,
    firstResponseAt: row.first_response_at as string | null,
    resolvedAt: row.resolved_at as string | null,
    source: row.source as string,
    tags: row.tags as string[] || [],
    browserInfo: row.browser_info as string | null,
    osInfo: row.os_info as string | null,
    appVersion: row.app_version as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCommentFromDB(row: Record<string, unknown>): SupportTicketComment {
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string,
    authorId: row.author_id as string,
    authorEmail: row.author_email as string,
    authorName: row.author_name as string | null,
    isAgent: row.is_agent as boolean,
    isInternal: row.is_internal as boolean,
    content: row.content as string,
    attachments: row.attachments as Array<{ filename: string; url: string; mimeType: string; size: number }>,
    createdAt: row.created_at as string,
    editedAt: row.edited_at as string | null,
  };
}

async function logTicketEvent(
  ticketId: string,
  eventType: string,
  newValue: string | null,
  performedBy: string,
  performedByEmail: string
): Promise<void> {
  await supabaseAdmin.from("support_ticket_events").insert({
    ticket_id: ticketId,
    event_type: eventType,
    new_value: newValue,
    performed_by: performedBy,
    performed_by_email: performedByEmail,
  });
}

function calculateSLADeadline(priority: string, createdAt: string): string {
  // Simplified SLA calculation - can be enhanced with business hours
  const hours: Record<string, number> = {
    urgent: 1,
    high: 4,
    medium: 8,
    low: 24,
  };
  
  const date = new Date(createdAt);
  date.setHours(date.getHours() + (hours[priority] || 24));
  return date.toISOString();
}
