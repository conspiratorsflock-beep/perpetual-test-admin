"use server";

import { auth } from "@/lib/dev-auth/server";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TestEmailDomain } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

const DOMAIN_RE =
  /^(?!https?:\/\/)(?!.*\/)(?!.*\s)[a-zA-Z0-9][a-zA-Z0-9-]{0,62}(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,62})+$/;

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain);
}

function mapDomain(row: {
  id: string;
  domain: string;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
}): TestEmailDomain {
  return {
    id: row.id,
    domain: row.domain,
    isActive: row.is_active,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at,
    deactivatedBy: row.deactivated_by,
  };
}

/**
 * List all test email domains, active first.
 */
export async function listTestEmailDomains(): Promise<TestEmailDomain[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("test_email_domains")
    .select("id, domain, is_active, notes, created_by, created_at, deactivated_at, deactivated_by")
    .order("is_active", { ascending: false })
    .order("domain", { ascending: true });

  if (error) {
    console.error("Failed to list test email domains:", error);
    return [];
  }

  return (data || []).map(mapDomain);
}

/**
 * Add a new test email domain, or reactivate a deactivated one.
 */
export async function addTestEmailDomain(
  domain: string,
  notes?: string | null
): Promise<TestEmailDomain> {
  await requireAdmin();

  const normalized = normalizeDomain(domain);
  if (!isValidDomain(normalized)) {
    throw new Error("Invalid domain format");
  }

  // Check for existing domain (including deactivated)
  const { data: existing } = await supabaseAdmin
    .from("test_email_domains")
    .select("id, is_active")
    .eq("domain", normalized)
    .maybeSingle();

  const { userId } = await auth();

  if (existing) {
    if (existing.is_active) {
      throw new Error("Domain already exists and is active");
    }
    // Reactivate the deactivated domain
    const { data: updated, error } = await supabaseAdmin
      .from("test_email_domains")
      .update({
        is_active: true,
        deactivated_at: null,
        deactivated_by: null,
        notes: notes ?? null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || "Failed to reactivate domain");
    }

    await logAdminAction({
      action: "test_email_domain.reactivate",
      targetType: "system",
      targetId: updated.id,
      targetName: normalized,
      metadata: { notes, reason: "re-added" },
    });

    return mapDomain(updated);
  }

  // Insert new domain
  const { data: inserted, error } = await supabaseAdmin
    .from("test_email_domains")
    .insert({
      domain: normalized,
      notes: notes ?? null,
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to add domain");
  }

  await logAdminAction({
    action: "test_email_domain.create",
    targetType: "system",
    targetId: inserted.id,
    targetName: normalized,
    metadata: { notes },
  });

  return mapDomain(inserted);
}

/**
 * Soft-deactivate a domain. Existing mailboxes keep working until TTL;
 * new test emails cannot be created on this domain.
 */
export async function deactivateTestEmailDomain(id: string): Promise<void> {
  await requireAdmin();

  const { data: domain } = await supabaseAdmin
    .from("test_email_domains")
    .select("domain, is_active")
    .eq("id", id)
    .single();

  if (!domain) {
    throw new Error("Domain not found");
  }

  const { userId } = await auth();

  const { error } = await supabaseAdmin
    .from("test_email_domains")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivated_by: userId ?? null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "test_email_domain.deactivate",
    targetType: "system",
    targetId: id,
    targetName: domain.domain,
    metadata: { stopNewOnly: true },
  });
}

/**
 * Reactivate a previously deactivated domain.
 */
export async function reactivateTestEmailDomain(id: string): Promise<void> {
  await requireAdmin();

  const { data: domain } = await supabaseAdmin
    .from("test_email_domains")
    .select("domain")
    .eq("id", id)
    .single();

  if (!domain) {
    throw new Error("Domain not found");
  }

  const { error } = await supabaseAdmin
    .from("test_email_domains")
    .update({
      is_active: true,
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "test_email_domain.reactivate",
    targetType: "system",
    targetId: id,
    targetName: domain.domain,
    metadata: {},
  });
}
