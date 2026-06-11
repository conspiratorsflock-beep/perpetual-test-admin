"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import type { SupportTicketComment } from "@/types/admin";
import { mapCommentFromDB, logTicketEvent } from "./shared";
import { PER_TICKET_CHILD_LIMIT } from "@/lib/constants/query-limits";
import {
  entityId,
  emailString,
  nameString,
  descriptionString,
  urlString,
} from "@/lib/validation/common";

const addTicketCommentSchema = z.object({
  ticketId: entityId,
  content: descriptionString,
  authorId: entityId,
  authorEmail: emailString,
  authorName: nameString,
  isInternal: z.boolean(),
  isAgent: z.boolean(),
  attachments: z.array(
    z.object({
      filename: nameString,
      url: urlString,
      mimeType: z.string().trim().max(128),
      size: z.number().int().min(0),
    })
  ),
});

export async function getSupportTicketComments(ticketId: string): Promise<SupportTicketComment[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("support_ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(PER_TICKET_CHILD_LIMIT);

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
  const parsed = addTicketCommentSchema.safeParse({
    ticketId,
    content,
    authorId,
    authorEmail,
    authorName,
    isInternal,
    isAgent,
    attachments,
  });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const { data, error } = await supabaseAdmin
    .from("support_ticket_comments")
    .insert({
      ticket_id: parsed.data.ticketId,
      author_id: parsed.data.authorId,
      author_email: parsed.data.authorEmail,
      author_name: parsed.data.authorName,
      is_agent: parsed.data.isAgent,
      is_internal: parsed.data.isInternal,
      content: parsed.data.content,
      attachments: parsed.data.attachments,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  // Update ticket status if agent replies to pending ticket
  if (parsed.data.isAgent && !parsed.data.isInternal) {
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("status")
      .eq("id", parsed.data.ticketId)
      .single();

    if (ticket?.status === "pending") {
      await supabaseAdmin
        .from("support_tickets")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", parsed.data.ticketId);
    }
  }

  await logTicketEvent(parsed.data.ticketId, "comment_added", null, parsed.data.authorId, parsed.data.authorEmail);

  await logAdminAction({
    action: "support_ticket.comment_add",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    metadata: { isInternal: parsed.data.isInternal, isAgent: parsed.data.isAgent },
  });

  return mapCommentFromDB(data);
}
