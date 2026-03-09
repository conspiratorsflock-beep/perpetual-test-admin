"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import type {
  TicketSeedingConfig,
  TicketSeedingResult,
  AgentAvailability,
  SupportTeamMember,
} from "@/types/admin";
import { revalidatePath } from "next/cache";

// ============================================
// Ticket Seeding
// ============================================

export async function getUnassignedTickets(
  categories: string[],
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  let query = supabaseAdmin
    .from("support_tickets")
    .select("*")
    .is("assigned_to", null)
    .in("status", ["open", "pending"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch unassigned tickets: ${error.message}`);
  return data || [];
}

export async function getAvailableAgents(
  respectSchedule: boolean = false
): Promise<AgentAvailability[]> {
  const { data: agents, error } = await supabaseAdmin
    .from("support_team_members")
    .select("*")
    .eq("is_available", true);

  if (error || !agents) return [];

  const availabilityList: AgentAvailability[] = [];

  for (const agent of agents) {
    const { count } = await supabaseAdmin
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", agent.id)
      .in("status", ["open", "in_progress", "pending"]);

    let isOnDuty = true;
    if (respectSchedule) {
      const { data: dutyCheck } = await supabaseAdmin.rpc("is_agent_on_duty", {
        agent_id: agent.id,
      });
      isOnDuty = dutyCheck || false;
    }

    availabilityList.push({
      agentId: agent.id,
      agentName: agent.name || agent.email,
      isOnline: agent.is_online || false,
      isOnDuty,
      timezone: "America/New_York", // Default, can be fetched from schedule
      currentWorkload: count || 0,
      maxCapacity: agent.max_open_tickets || 10,
      skills: agent.skills || [],
    });
  }

  return availabilityList;
}

export async function seedUnassignedTickets(
  config: TicketSeedingConfig
): Promise<TicketSeedingResult> {
  const result: TicketSeedingResult = { seeded: 0, assignments: [], errors: [] };

  try {
    const tickets = await getUnassignedTickets(config.categories);
    if (tickets.length === 0) return result;

    const agents = await getAvailableAgents(config.respectSchedule);
    if (agents.length === 0) {
      result.errors.push("No available agents found");
      return result;
    }

    const workloadMap = new Map(agents.map((a) => [a.agentId, a.currentWorkload]));

    for (const ticket of tickets) {
      const currentAgents = agents.map((a) => ({
        ...a,
        currentWorkload: workloadMap.get(a.agentId) || a.currentWorkload,
      }));

      const agent = selectAgent(
        ticket,
        currentAgents,
        config.strategy,
        config.maxPerAgent
      );
      if (!agent) {
        result.errors.push(
          `No agent available for ticket ${ticket.ticket_number}`
        );
        continue;
      }

      const { error } = await supabaseAdmin
        .from("support_tickets")
        .update({
          assigned_to: agent.agentId,
          auto_assigned: true,
          seeded_at: new Date().toISOString(),
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) {
        result.errors.push(
          `Failed to assign ticket ${ticket.ticket_number}: ${error.message}`
        );
        continue;
      }

      workloadMap.set(
        agent.agentId,
        (workloadMap.get(agent.agentId) || 0) + 1
      );

      result.assignments.push({
        ticketId: ticket.id as string,
        agentId: agent.agentId,
        agentName: agent.agentName,
      });
      result.seeded++;
    }

    // Log seeding operation
    await supabaseAdmin.from("support_ticket_seeding_log").insert({
      tickets_seeded: result.seeded,
      strategy: config.strategy,
      respect_schedule: config.respectSchedule,
      max_per_agent: config.maxPerAgent,
      categories: config.categories,
    });

    await logAdminAction({
      action: "support_ticket.seed",
      targetType: "support_ticket",
      targetId: null,
      metadata: {
        seeded: result.seeded,
        strategy: config.strategy,
        respectSchedule: config.respectSchedule,
      },
    });

    revalidatePath("/help-desk/queue");
    revalidatePath("/help-desk/my-tickets");
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  return result;
}

function selectAgent(
  ticket: Record<string, unknown>,
  agents: AgentAvailability[],
  strategy: string,
  maxPerAgent: number
): AgentAvailability | null {
  const available = agents.filter(
    (a) =>
      a.isOnDuty &&
      a.currentWorkload < a.maxCapacity &&
      a.currentWorkload < maxPerAgent
  );

  if (available.length === 0) return null;

  switch (strategy) {
    case "round_robin":
      return available.sort((a, b) => a.currentWorkload - b.currentWorkload)[0];
    case "workload_balanced":
      return available.sort(
        (a, b) =>
          b.maxCapacity -
          b.currentWorkload -
          (a.maxCapacity - a.currentWorkload)
      )[0];
    case "skill_based":
      const skilled = available.filter((a) =>
        a.skills.some((s) =>
          (ticket.category as string)
            ?.toLowerCase()
            .includes(s.toLowerCase())
        )
      );
      return (skilled.length > 0 ? skilled : available).sort(
        (a, b) => a.currentWorkload - b.currentWorkload
      )[0];
    default:
      return available[0];
  }
}
