"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import {
  entityId,
  emailString,
  ticketStatus,
  ticketPriority,
  descriptionString,
} from "@/lib/validation/common";
import { logTicketEvent, calculateSLADeadline } from "./shared";

// ============================================
// Ticket Actions
// ============================================

const assignTicketSchema = z.object({
  ticketId: entityId,
  agentId: entityId,
  agentEmail: emailString,
});

const updateTicketStatusSchema = z.object({
  ticketId: entityId,
  status: ticketStatus,
  agentId: entityId,
  agentEmail: emailString,
});

const updateTicketPrioritySchema = z.object({
  ticketId: entityId,
  priority: ticketPriority,
  agentId: entityId,
  agentEmail: emailString,
});

const closeTicketSchema = z.object({
  ticketId: entityId,
  agentId: entityId,
  agentEmail: emailString,
  resolution: descriptionString.optional(),
});

export async function assignTicket(
  ticketId: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  await requireAdmin();
  const parsed = assignTicketSchema.safeParse({ ticketId, agentId, agentEmail });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      assigned_to: parsed.data.agentId,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticketId);

  if (error) {
    throw new Error(`Failed to assign ticket: ${error.message}`);
  }

  // Log event
  await logTicketEvent(parsed.data.ticketId, "assigned", null, parsed.data.agentId, parsed.data.agentEmail);

  // Audit log
  await logAdminAction({
    action: "support_ticket.assign",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    metadata: { assignedTo: parsed.data.agentId },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  await requireAdmin();
  const parsed = updateTicketStatusSchema.safeParse({ ticketId, status, agentId, agentEmail });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const updates: Record<string, string> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  // Set timestamps based on status
  if (parsed.data.status === "resolved") {
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update(updates)
    .eq("id", parsed.data.ticketId);

  if (error) {
    throw new Error(`Failed to update ticket status: ${error.message}`);
  }

  await logTicketEvent(parsed.data.ticketId, "status_changed", parsed.data.status, parsed.data.agentId, parsed.data.agentEmail);

  await logAdminAction({
    action: "support_ticket.status_change",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    metadata: { status: parsed.data.status },
  });
}

export async function updateTicketPriority(
  ticketId: string,
  priority: string,
  agentId: string,
  agentEmail: string
): Promise<void> {
  await requireAdmin();
  const parsed = updateTicketPrioritySchema.safeParse({ ticketId, priority, agentId, agentEmail });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  // Recalculate SLA deadline
  const { data: ticket } = await supabaseAdmin
    .from("support_tickets")
    .select("created_at")
    .eq("id", parsed.data.ticketId)
    .single();

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      priority: parsed.data.priority,
      sla_deadline: ticket?.created_at
        ? await calculateSLADeadline(parsed.data.priority, ticket.created_at)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticketId);

  if (error) {
    throw new Error(`Failed to update priority: ${error.message}`);
  }

  await logTicketEvent(parsed.data.ticketId, "priority_changed", parsed.data.priority, parsed.data.agentId, parsed.data.agentEmail);

  await logAdminAction({
    action: "support_ticket.priority_change",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    metadata: { priority: parsed.data.priority },
  });
}

export async function closeTicket(
  ticketId: string,
  agentId: string,
  agentEmail: string,
  resolution?: string
): Promise<void> {
  await requireAdmin();
  const parsed = closeTicketSchema.safeParse({ ticketId, agentId, agentEmail, resolution });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      status: "closed",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticketId);

  if (error) {
    throw new Error(`Failed to close ticket: ${error.message}`);
  }

  await logTicketEvent(parsed.data.ticketId, "closed", parsed.data.resolution || null, parsed.data.agentId, parsed.data.agentEmail);

  await logAdminAction({
    action: "support_ticket.close",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    metadata: { resolution: parsed.data.resolution },
  });
}
