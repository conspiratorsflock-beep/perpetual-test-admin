"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";

export interface GlobalSearchResult {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    type: "user";
  }>;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    type: "organization";
  }>;
  projects: Array<{
    id: string;
    name: string;
    orgName: string;
    type: "project";
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: number;
    subject: string;
    userEmail: string;
    type: "ticket";
  }>;
}

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  if (!(await isCurrentUserAdmin())) {
    return { users: [], organizations: [], projects: [], tickets: [] };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { users: [], organizations: [], projects: [], tickets: [] };
  }

  const searchPattern = `%${trimmed}%`;

  const [usersResponse, orgsResponse, projectsResponse, ticketsResponse] = await Promise.all([
    // Search Clerk users
    (async () => {
      try {
        const client = await clerkClient();
        const list = await client.users.getUserList({
          query: trimmed,
          limit: 5,
        });
        return list.data.map((u) => ({
          id: u.id,
          email: u.emailAddresses[0]?.emailAddress || "",
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
          type: "user" as const,
        }));
      } catch {
        return [];
      }
    })(),

    // Search organizations
    supabaseAdmin
      .from("organizations")
      .select("id, name, slug")
      .or(`name.ilike.${searchPattern},slug.ilike.${searchPattern}`)
      .limit(5)
      .then(({ data }) =>
        (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          type: "organization" as const,
        }))
      ),

    // Search projects
    supabaseAdmin
      .from("projects")
      .select("id, name, organizations(name)")
      .ilike("name", searchPattern)
      .is("deleted_at", null)
      .limit(5)
      .then(({ data }) =>
        (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          orgName: (row.organizations as unknown as { name?: string } | null)?.name || "",
          type: "project" as const,
        }))
      ),

    // Search support tickets
    supabaseAdmin
      .from("support_tickets")
      .select("id, ticket_number, subject, user_email")
      .or(`subject.ilike.${searchPattern},user_email.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) =>
        (data || []).map((row) => ({
          id: row.id,
          ticketNumber: row.ticket_number,
          subject: row.subject,
          userEmail: row.user_email,
          type: "ticket" as const,
        }))
      ),
  ]);

  return {
    users: usersResponse,
    organizations: orgsResponse,
    projects: projectsResponse,
    tickets: ticketsResponse,
  };
}
