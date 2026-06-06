"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  SupportTicketWithAssignee,
  SupportTicketComment,
  SupportTeamMember,
  TicketCategory,
  TicketStatus,
  TicketPriority,
} from "@/types/admin";

const RECENT_COMMENTS_LIMIT = 3;

interface MyTicketsFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  slaStatus?: ("healthy" | "at_risk" | "breached")[];
}

export async function getMyTickets(
  agentId: string,
  filters: MyTicketsFilters = {}
): Promise<SupportTicketWithAssignee[]> {
  let query = supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("assigned_to", agentId);

  if (filters.status?.length) {
    query = query.in("status", filters.status);
  } else {
    query = query.in("status", ["open", "in_progress", "pending"]);
  }

  if (filters.priority?.length) {
    query = query.in("priority", filters.priority);
  }

  query = query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  const { data: tickets, error } = await query;
  if (error || !tickets) {
    throw new Error(`Failed to fetch my tickets: ${error?.message}`);
  }

  const enriched: SupportTicketWithAssignee[] = [];

  for (const ticket of tickets) {
    const { data: comments } = await supabaseAdmin
      .from("support_ticket_comments")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_COMMENTS_LIMIT);

    const sla = calculateSLAStatus(
      ticket.priority,
      ticket.created_at ?? "",
      ticket.sla_deadline
    );

    enriched.push({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      userId: ticket.user_id,
      userEmail: ticket.user_email ?? "",
      userName: ticket.user_name,
      orgId: ticket.org_id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category as TicketCategory,
      status: ticket.status as TicketStatus,
      priority: ticket.priority as TicketPriority,
      // NOTE: only the assignee id is available here; not enriched into a SupportTeamMember.
      assignedTo: (ticket.assigned_to ?? undefined) as unknown as SupportTeamMember | undefined,
      slaDeadline: ticket.sla_deadline,
      resolvedAt: ticket.resolved_at,
      source: ticket.source,
      browserInfo: ticket.browser_info,
      osInfo: ticket.os_info,
      appVersion: ticket.app_version,
      closedAt: ticket.closed_at,
      isActive: ticket.is_active ?? true,
      metadata: (ticket.metadata as Record<string, unknown>) || {},
      createdAt: ticket.created_at ?? "",
      updatedAt: ticket.updated_at ?? "",
      recentComments: (comments || []).map((c) => ({
        id: c.id,
        ticketId: c.ticket_id,
        authorId: c.author_id,
        authorEmail: c.author_email ?? "",
        authorName: c.author_name,
        // NOTE: support_ticket_comments has no is_agent column in the shared DB.
        isAgent: (c as { is_agent?: boolean }).is_agent ?? false,
        isInternal: c.is_internal ?? false,
        isEdited: c.is_edited ?? false,
        content: c.content,
        attachments: (c.attachments as SupportTicketComment["attachments"]) || [],
        createdAt: c.created_at ?? "",
        editedAt: c.edited_at,
      })),
      slaStatus: sla.status,
      slaMinutesRemaining: sla.minutesRemaining,
    });
  }

  if (filters.slaStatus?.length) {
    return enriched.filter((t) => filters.slaStatus?.includes(t.slaStatus));
  }

  return enriched;
}

function calculateSLAStatus(
  priority: string,
  createdAt: string,
  slaDeadline: string | null
): {
  status: "healthy" | "at_risk" | "breached";
  minutesRemaining: number;
} {
  const now = new Date();

  // Use provided SLA deadline or calculate from priority
  let deadline: Date;
  if (slaDeadline) {
    deadline = new Date(slaDeadline);
  } else {
    const created = new Date(createdAt);
    const slaHours: Record<string, number> = {
      urgent: 2,
      high: 8,
      medium: 24,
      low: 72,
    };
    deadline = new Date(
      created.getTime() + (slaHours[priority] || 24) * 60 * 60 * 1000
    );
  }

  const minutesRemaining = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60)
  );

  if (minutesRemaining < 0) {
    return { status: "breached", minutesRemaining };
  }
  if (minutesRemaining < 60) {
    return { status: "at_risk", minutesRemaining };
  }
  return { status: "healthy", minutesRemaining };
}

export async function getAgentWorkload(agentId: string): Promise<{
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  atRisk: number;
  breached: number;
}> {
  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("status, priority, created_at, sla_deadline")
    .eq("assigned_to", agentId)
    .in("status", ["open", "in_progress", "pending"]);

  if (error || !tickets) {
    return { total: 0, open: 0, inProgress: 0, pending: 0, atRisk: 0, breached: 0 };
  }

  let atRisk = 0;
  let breached = 0;

  for (const ticket of tickets) {
    const sla = calculateSLAStatus(
      ticket.priority,
      ticket.created_at ?? "",
      ticket.sla_deadline
    );
    if (sla.status === "at_risk") atRisk++;
    if (sla.status === "breached") breached++;
  }

  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    atRisk,
    breached,
  };
}
