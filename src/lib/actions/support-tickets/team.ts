"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";

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
    isAvailable: member.is_available ?? false,
    maxOpenTickets: member.max_open_tickets ?? 0,
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

  await logAdminAction({
    action: "support_team.member_add",
    targetType: "user",
    targetId: userId,
    targetName: email,
    metadata: { role },
  });
}
