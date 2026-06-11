"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logTicketEvent, calculateSLADeadline } from "./shared";

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
      sla_deadline: ticket?.created_at
        ? await calculateSLADeadline(priority, ticket.created_at)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Failed to update priority: ${error.message}`);
  }

  await logTicketEvent(ticketId, "priority_changed", priority, agentId, agentEmail);

  await logAdminAction({
    action: "support_ticket.priority_change",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: { priority },
  });
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
