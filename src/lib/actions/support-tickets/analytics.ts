"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";

// ============================================
// Analytics
// ============================================

export async function getSupportAnalytics(params: {
  startDate: string;
  endDate: string;
}): Promise<{
  totalTickets: number;
  openTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  slaCompliancePct: number;
}> {
  await requireAdmin();

  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("id, status, priority, category, resolved_at, created_at, sla_deadline")
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  const rows = tickets || [];
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let openTickets = 0;
  let slaMet = 0;
  let slaChecked = 0;

  for (const t of rows) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    if (t.status === "open" || t.status === "in_progress" || t.status === "pending") {
      openTickets++;
    }
    if (t.sla_deadline) {
      slaChecked++;
      const resolved = t.resolved_at ? new Date(t.resolved_at) : new Date();
      if (resolved <= new Date(t.sla_deadline)) slaMet++;
    }
  }

  // Calculate avg resolution time from resolved tickets
  const resolutionTimes: number[] = [];
  for (const t of rows) {
    if (t.resolved_at && t.created_at) {
      const mins = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      if (mins > 0) resolutionTimes.push(mins);
    }
  }
  const avgResolutionTimeMinutes = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : 0;

  // Calculate avg first response time by finding first agent comment per ticket
  const ticketIds = rows.map((t) => t.id);
  let avgResponseTimeMinutes = 0;

  if (ticketIds.length > 0) {
    const { data: teamMembers } = await supabaseAdmin
      .from("support_team_members")
      .select("user_id");
    const agentIds = new Set((teamMembers || []).map((m) => m.user_id));

    const { data: comments } = await supabaseAdmin
      .from("support_ticket_comments")
      .select("ticket_id, author_id, created_at")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true });

    const firstResponseByTicket: Record<string, string> = {};
    for (const c of comments || []) {
      if (agentIds.has(c.author_id) && !firstResponseByTicket[c.ticket_id] && c.created_at) {
        firstResponseByTicket[c.ticket_id] = c.created_at;
      }
    }

    const responseTimes: number[] = [];
    for (const t of rows) {
      const firstResponse = firstResponseByTicket[t.id];
      if (firstResponse && t.created_at) {
        const mins = (new Date(firstResponse).getTime() - new Date(t.created_at).getTime()) / 60000;
        if (mins > 0) responseTimes.push(mins);
      }
    }
    avgResponseTimeMinutes = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
  }

  return {
    totalTickets: rows.length,
    openTickets,
    byStatus,
    byPriority,
    byCategory,
    avgResponseTimeMinutes,
    avgResolutionTimeMinutes,
    slaCompliancePct: slaChecked > 0 ? Math.round((slaMet / slaChecked) * 100) : 100,
  };
}

export async function getTicketVolumeData(params: {
  startDate: string;
  endDate: string;
}): Promise<Array<{ date: string; created: number; resolved: number }>> {
  await requireAdmin();

  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("created_at, resolved_at")
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (error) throw new Error(`Failed to fetch volume data: ${error.message}`);

  const dateMap: Record<string, { created: number; resolved: number }> = {};

  for (const t of tickets || []) {
    if (!t.created_at) continue;
    const createdDate = new Date(t.created_at).toISOString().split("T")[0];
    dateMap[createdDate] = dateMap[createdDate] || { created: 0, resolved: 0 };
    dateMap[createdDate].created++;

    if (t.resolved_at) {
      const resolvedDate = new Date(t.resolved_at).toISOString().split("T")[0];
      dateMap[resolvedDate] = dateMap[resolvedDate] || { created: 0, resolved: 0 };
      dateMap[resolvedDate].resolved++;
    }
  }

  return Object.entries(dateMap)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAgentLeaderboard(params: {
  startDate: string;
  endDate: string;
}): Promise<Array<{
  userId: string;
  name: string;
  email: string;
  resolved: number;
  avgResolutionMinutes: number;
  openAssigned: number;
}>> {
  await requireAdmin();

  const { data: agents, error: agentsError } = await supabaseAdmin
    .from("support_team_members")
    .select("user_id, name, email");

  if (agentsError) throw new Error(`Failed to fetch agents: ${agentsError.message}`);

  const agentMap = new Map((agents || []).map((a) => [a.user_id, a]));
  const agentIds = Array.from(agentMap.keys());

  if (agentIds.length === 0) return [];

  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from("support_tickets")
    .select("assigned_to, resolved_at, created_at, status")
    .in("assigned_to", agentIds)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (ticketsError) throw new Error(`Failed to fetch tickets: ${ticketsError.message}`);

  const stats: Record<string, { resolved: number; resolutionTimes: number[]; openAssigned: number }> = {};

  for (const t of tickets || []) {
    const aid = t.assigned_to;
    if (!aid) continue;
    stats[aid] = stats[aid] || { resolved: 0, resolutionTimes: [], openAssigned: 0 };

    if (t.resolved_at && t.created_at) {
      stats[aid].resolved++;
      const mins = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      if (mins > 0) stats[aid].resolutionTimes.push(mins);
    }

    if (t.status === "open" || t.status === "in_progress" || t.status === "pending") {
      stats[aid].openAssigned++;
    }
  }

  return agentIds
    .map((id) => {
      const agent = agentMap.get(id);
      const s = stats[id] || { resolved: 0, resolutionTimes: [], openAssigned: 0 };
      return {
        userId: id,
        name: agent?.name || "Unknown",
        email: agent?.email || "",
        resolved: s.resolved,
        avgResolutionMinutes: s.resolutionTimes.length > 0
          ? Math.round(s.resolutionTimes.reduce((a, b) => a + b, 0) / s.resolutionTimes.length)
          : 0,
        openAssigned: s.openAssigned,
      };
    })
    .sort((a, b) => b.resolved - a.resolved);
}
