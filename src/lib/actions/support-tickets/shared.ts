import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupportTicket, SupportTicketComment, SupportTicketLink, TicketCategory, TicketStatus, TicketPriority } from "@/types/admin";

export function mapTicketFromDB(row: Record<string, unknown>): SupportTicket {
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

export function mapCommentFromDB(row: Record<string, unknown>): SupportTicketComment {
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

export function mapLinkFromDB(row: Record<string, unknown>): SupportTicketLink {
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    resourceName: row.resource_name as string | null,
    resourceUrl: row.resource_url as string | null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function logTicketEvent(
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

export async function calculateSLADeadline(priority: string, createdAt: string): Promise<string> {
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
