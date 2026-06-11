"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { SupportTicketComment } from "@/types/admin";
import { mapCommentFromDB, logTicketEvent } from "./shared";

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

  await logAdminAction({
    action: "support_ticket.comment_add",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: { isInternal, isAgent },
  });

  return mapCommentFromDB(data);
}
