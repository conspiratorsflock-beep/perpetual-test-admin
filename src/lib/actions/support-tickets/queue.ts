"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { SupportTicket } from "@/types/admin";
import { mapTicketFromDB } from "./shared";

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
    .select(
      "id, ticket_number, user_id, user_email, user_name, org_id, subject, description, category, status, priority, assigned_to, sla_deadline, resolved_at, closed_at, is_active, metadata, source, browser_info, os_info, app_version, created_at, updated_at",
      { count: "exact" }
    )
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

/**
 * Get count of open tickets (open, in_progress, pending).
 */
export async function getOpenTicketCount(): Promise<number> {
  await requireAdmin();
  const { count, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .in("status", ["open", "in_progress", "pending"]);

  if (error) {
    console.error("Failed to get open ticket count:", error);
    return 0;
  }

  return count ?? 0;
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
