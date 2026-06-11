"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { SupportTicketEvent, SupportTicketLink } from "@/types/admin";
import { mapLinkFromDB } from "./shared";
import { PER_TICKET_CHILD_LIMIT } from "@/lib/constants/query-limits";

export async function getSupportTicketEvents(ticketId: string): Promise<SupportTicketEvent[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("support_ticket_events")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(PER_TICKET_CHILD_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    eventType: row.event_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    performedBy: row.performed_by,
    performedByName: row.performed_by_name,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at ?? "",
  }));
}

export async function getSupportTicketLinks(ticketId: string): Promise<SupportTicketLink[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("support_ticket_links")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(PER_TICKET_CHILD_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch links: ${error.message}`);
  }

  return (data || []).map(mapLinkFromDB);
}
