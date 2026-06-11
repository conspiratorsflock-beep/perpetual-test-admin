"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";
import {
  entityId,
  emailString,
  nameString,
  supportTeamRole,
} from "@/lib/validation/common";

// ============================================
// Team Management
// ============================================

const addTeamMemberSchema = z.object({
  userId: entityId,
  email: emailString,
  name: nameString.nullable(),
  role: supportTeamRole,
});

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
  const parsed = addTeamMemberSchema.safeParse({ userId, email, name, role });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }
  const { error } = await supabaseAdmin.from("support_team_members").insert({
    user_id: parsed.data.userId,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  });

  if (error) {
    throw new Error(`Failed to add team member: ${error.message}`);
  }

  await logAdminAction({
    action: "support_team.member_add",
    targetType: "user",
    targetId: parsed.data.userId,
    targetName: parsed.data.email,
    metadata: { role: parsed.data.role },
  });
}
