"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { REFERENCE_TABLE_LIMIT } from "@/lib/constants/query-limits";

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
    .order("created_at", { ascending: false })
    .limit(REFERENCE_TABLE_LIMIT);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch canned responses: ${error.message}`);
  }

  return data || [];
}

export async function incrementCannedResponseUse(_id: string): Promise<void> {
  // No-op: `use_count` column does not exist on `support_canned_responses`.
  // Kept as a no-op to avoid breaking callers.
}
