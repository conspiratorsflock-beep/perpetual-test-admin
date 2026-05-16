"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { SupportTicket, SupportTicketComment, SupportTicketEvent, TicketCategory, TicketStatus, TicketPriority } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

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
  await requireAdmin();
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
  await requireAdmin();
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

export async function getSupportTicketByReference(ticketNumber: number): Promise<SupportTicket | null> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("ticket_number", ticketNumber)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }

  return data ? mapTicketFromDB(data) : null;
}

export async function getSupportTicketComments(ticketId: string): Promise<SupportTicketComment[]> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      assigned_to: agentId,
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
  await requireAdmin();
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
  await requireAdmin();
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
      sla_deadline: ticket ? await calculateSLADeadline(priority, ticket.created_at) : null,
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  openTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  slaCompliancePct: number;
}> {
  await requireAdmin();

  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("id, status, priority, category, resolved_at, created_at, sla_deadline")
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  const rows = tickets || [];
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let openTickets = 0;
  let slaMet = 0;
  let slaChecked = 0;

  for (const t of rows) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    if (t.status === "open" || t.status === "in_progress" || t.status === "pending") {
      openTickets++;
    }
    if (t.sla_deadline) {
      slaChecked++;
      const resolved = t.resolved_at ? new Date(t.resolved_at) : new Date();
      if (resolved <= new Date(t.sla_deadline)) slaMet++;
    }
  }

  // Calculate avg resolution time from resolved tickets
  const resolutionTimes: number[] = [];
  for (const t of rows) {
    if (t.resolved_at && t.created_at) {
      const mins = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      if (mins > 0) resolutionTimes.push(mins);
    }
  }
  const avgResolutionTimeMinutes = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : 0;

  // Calculate avg first response time by finding first agent comment per ticket
  const ticketIds = rows.map((t) => t.id);
  let avgResponseTimeMinutes = 0;

  if (ticketIds.length > 0) {
    const { data: teamMembers } = await supabaseAdmin
      .from("support_team_members")
      .select("user_id");
    const agentIds = new Set((teamMembers || []).map((m) => m.user_id));

    const { data: comments } = await supabaseAdmin
      .from("support_ticket_comments")
      .select("ticket_id, author_id, created_at")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true });

    const firstResponseByTicket: Record<string, string> = {};
    for (const c of comments || []) {
      if (agentIds.has(c.author_id) && !firstResponseByTicket[c.ticket_id]) {
        firstResponseByTicket[c.ticket_id] = c.created_at;
      }
    }

    const responseTimes: number[] = [];
    for (const t of rows) {
      const firstResponse = firstResponseByTicket[t.id];
      if (firstResponse && t.created_at) {
        const mins = (new Date(firstResponse).getTime() - new Date(t.created_at).getTime()) / 60000;
        if (mins > 0) responseTimes.push(mins);
      }
    }
    avgResponseTimeMinutes = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
  }

  return {
    totalTickets: rows.length,
    openTickets,
    byStatus,
    byPriority,
    byCategory,
    avgResponseTimeMinutes,
    avgResolutionTimeMinutes,
    slaCompliancePct: slaChecked > 0 ? Math.round((slaMet / slaChecked) * 100) : 100,
  };
}

export async function getTicketVolumeData(params: {
  startDate: string;
  endDate: string;
}): Promise<Array<{ date: string; created: number; resolved: number }>> {
  await requireAdmin();

  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("created_at, resolved_at")
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (error) throw new Error(`Failed to fetch volume data: ${error.message}`);

  const dateMap: Record<string, { created: number; resolved: number }> = {};

  for (const t of tickets || []) {
    const createdDate = new Date(t.created_at).toISOString().split("T")[0];
    dateMap[createdDate] = dateMap[createdDate] || { created: 0, resolved: 0 };
    dateMap[createdDate].created++;

    if (t.resolved_at) {
      const resolvedDate = new Date(t.resolved_at).toISOString().split("T")[0];
      dateMap[resolvedDate] = dateMap[resolvedDate] || { created: 0, resolved: 0 };
      dateMap[resolvedDate].resolved++;
    }
  }

  return Object.entries(dateMap)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAgentLeaderboard(params: {
  startDate: string;
  endDate: string;
}): Promise<Array<{
  userId: string;
  name: string;
  email: string;
  resolved: number;
  avgResolutionMinutes: number;
  openAssigned: number;
}>> {
  await requireAdmin();

  const { data: agents, error: agentsError } = await supabaseAdmin
    .from("support_team_members")
    .select("user_id, name, email");

  if (agentsError) throw new Error(`Failed to fetch agents: ${agentsError.message}`);

  const agentMap = new Map((agents || []).map((a) => [a.user_id, a]));
  const agentIds = Array.from(agentMap.keys());

  if (agentIds.length === 0) return [];

  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from("support_tickets")
    .select("assigned_to, resolved_at, created_at, status")
    .in("assigned_to", agentIds)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (ticketsError) throw new Error(`Failed to fetch tickets: ${ticketsError.message}`);

  const stats: Record<string, { resolved: number; resolutionTimes: number[]; openAssigned: number }> = {};

  for (const t of tickets || []) {
    const aid = t.assigned_to;
    if (!aid) continue;
    stats[aid] = stats[aid] || { resolved: 0, resolutionTimes: [], openAssigned: 0 };

    if (t.resolved_at && t.created_at) {
      stats[aid].resolved++;
      const mins = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      if (mins > 0) stats[aid].resolutionTimes.push(mins);
    }

    if (t.status === "open" || t.status === "in_progress" || t.status === "pending") {
      stats[aid].openAssigned++;
    }
  }

  return agentIds
    .map((id) => {
      const agent = agentMap.get(id);
      const s = stats[id] || { resolved: 0, resolutionTimes: [], openAssigned: 0 };
      return {
        userId: id,
        name: agent?.name || "Unknown",
        email: agent?.email || "",
        resolved: s.resolved,
        avgResolutionMinutes: s.resolutionTimes.length > 0
          ? Math.round(s.resolutionTimes.reduce((a, b) => a + b, 0) / s.resolutionTimes.length)
          : 0,
        openAssigned: s.openAssigned,
      };
    })
    .sort((a, b) => b.resolved - a.resolved);
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
    slaDeadline: row.sla_deadline as string | null,
    resolvedAt: row.resolved_at as string | null,
    closedAt: row.closed_at as string | null,
    isActive: row.is_active as boolean,
    metadata: row.metadata as Record<string, unknown> || {},
    source: row.source as string,
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
    isEdited: row.is_edited as boolean,
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
    performed_by_name: performedByEmail,
  });
}

async function calculateSLADeadline(priority: string, createdAt: string): Promise<string> {
  const { data: slaConfig } = await supabaseAdmin
    .from("support_sla_config")
    .select("first_response_hours")
    .eq("priority", priority)
    .single();

  const hours = slaConfig?.first_response_hours ?? 24;
  const date = new Date(createdAt);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
