"use server";

import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { entityId } from "@/lib/validation/common";
import type {
  TestEmailMailbox,
  TestEmailMessageSafe,
  TestEmailOverview,
  TestEmailAbuseRow,
  TestEmailHealth,
  TestEmailInboundHealth,
} from "@/types/admin";


const SAFE_MESSAGE_COLUMNS = "id, mailbox_id, received_at, read";

const forceExpireMailboxSchema = z.object({
  id: entityId,
});

const deleteMailboxSchema = z.object({
  id: entityId,
});

/**
 * Probe: are the test_email tables provisioned and queryable?
 */
export async function isTestEmailProvisioned(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("test_email_mailboxes")
      .select("id", { count: "exact", head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Overview metrics for the dashboard.
 */
export async function getTestEmailOverview(): Promise<TestEmailOverview> {
  await requireAdmin();

  const now = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      activeMailboxesResult,
      created24hResult,
      created7dResult,
      messages24hResult,
      messages7dResult,
      totalMessagesResult,
      totalMailboxesResult,
      usersAtCapResult,
    ] = await Promise.all([
      // Active mailboxes (not expired)
      supabaseAdmin
        .from("test_email_mailboxes")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", now),
      // Created 24h
      supabaseAdmin
        .from("test_email_mailboxes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayAgo),
      // Created 7d
      supabaseAdmin
        .from("test_email_mailboxes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      // Messages 24h
      supabaseAdmin
        .from("test_email_messages")
        .select("*", { count: "exact", head: true })
        .gte("received_at", dayAgo),
      // Messages 7d
      supabaseAdmin
        .from("test_email_messages")
        .select("*", { count: "exact", head: true })
        .gte("received_at", weekAgo),
      // Total messages (for avg)
      supabaseAdmin
        .from("test_email_messages")
        .select("*", { count: "exact", head: true }),
      // Total mailboxes (for avg)
      supabaseAdmin
        .from("test_email_mailboxes")
        .select("*", { count: "exact", head: true }),
      // Users at/near cap (≥25 active)
      // NOTE: this fetches all active mailboxes and tallies per user in JS.
      // Bounded dataset for an internal tool; monitor if dataset grows.
      supabaseAdmin
        .from("test_email_mailboxes")
        .select("user_id")
        .gt("expires_at", now),
    ]);

    // Tally users at cap
    const userCounts = new Map<string, number>();
    (usersAtCapResult.data || []).forEach((row) => {
      userCounts.set(row.user_id, (userCounts.get(row.user_id) || 0) + 1);
    });
    const usersAtCap = Array.from(userCounts.values()).filter((c) => c >= 25).length;

    const totalMessages = totalMessagesResult.count ?? 0;
    const totalMailboxes = totalMailboxesResult.count ?? 0;
    const avgMessagesPerMailbox =
      totalMailboxes > 0 ? Math.round((totalMessages / totalMailboxes) * 10) / 10 : 0;

    return {
      activeMailboxes: activeMailboxesResult.count ?? 0,
      created24h: created24hResult.count ?? 0,
      created7d: created7dResult.count ?? 0,
      messages24h: messages24hResult.count ?? 0,
      messages7d: messages7dResult.count ?? 0,
      avgMessagesPerMailbox,
      usersAtCap,
    };
  } catch (error) {
    console.error("Failed to get test email overview:", error);
    return {
      activeMailboxes: 0,
      created24h: 0,
      created7d: 0,
      messages24h: 0,
      messages7d: 0,
      avgMessagesPerMailbox: 0,
      usersAtCap: 0,
    };
  }
}

/**
 * Abuse signals: users with high active mailbox counts and high 24h creation volume.
 */
export async function getTestEmailAbuseSignals(): Promise<{
  byActiveCount: TestEmailAbuseRow[];
  by24hCreation: TestEmailAbuseRow[];
  nearCap: TestEmailAbuseRow[];
}> {
  await requireAdmin();

  const now = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch active mailboxes for per-user tally
    const { data: activeMailboxes } = await supabaseAdmin
      .from("test_email_mailboxes")
      .select("user_id, created_at")
      .gt("expires_at", now);

    // Fetch 24h creations
    const { data: recentMailboxes } = await supabaseAdmin
      .from("test_email_mailboxes")
      .select("user_id")
      .gte("created_at", dayAgo);

    const activeCounts = new Map<string, number>();
    (activeMailboxes || []).forEach((row) => {
      activeCounts.set(row.user_id, (activeCounts.get(row.user_id) || 0) + 1);
    });

    const recentCounts = new Map<string, number>();
    (recentMailboxes || []).forEach((row) => {
      recentCounts.set(row.user_id, (recentCounts.get(row.user_id) || 0) + 1);
    });

    const toRows = (map: Map<string, number>): TestEmailAbuseRow[] =>
      Array.from(map.entries())
        .map(([userId, activeMailboxes]) => ({
          userId,
          activeMailboxes,
          created24h: recentCounts.get(userId) || 0,
        }))
        .sort((a, b) => b.activeMailboxes - a.activeMailboxes);

    const allRows = toRows(activeCounts);

    return {
      byActiveCount: allRows.slice(0, 20),
      by24hCreation: allRows
        .filter((r) => r.created24h > 0)
        .sort((a, b) => b.created24h - a.created24h)
        .slice(0, 20),
      nearCap: allRows.filter((r) => r.activeMailboxes >= 20),
    };
  } catch (error) {
    console.error("Failed to get abuse signals:", error);
    return { byActiveCount: [], by24hCreation: [], nearCap: [] };
  }
}

/**
 * Search mailboxes by address, local_part, or user_id.
 */
export async function searchTestEmailMailboxes(query: string): Promise<TestEmailMailbox[]> {
  await requireAdmin();

  try {
    let dbQuery = supabaseAdmin
      .from("test_email_mailboxes")
      .select("id, local_part, address, user_id, organization_id, label, created_at, expires_at, extended")
      .limit(50);

    if (query) {
      const q = query.trim();
      // If it looks like a UUID, search user_id exactly; otherwise do ilike on address/local_part
      if (/^[0-9a-fA-F-]{36}$/.test(q)) {
        dbQuery = dbQuery.eq("user_id", q);
      } else {
        dbQuery = dbQuery.or(`address.ilike.%${q}%,local_part.ilike.%${q}%`);
      }
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to search mailboxes:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      localPart: row.local_part,
      address: row.address,
      userId: row.user_id,
      organizationId: row.organization_id,
      label: row.label,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      extended: row.extended,
    }));
  } catch (error) {
    console.error("Failed to search mailboxes:", error);
    return [];
  }
}

/**
 * Message volume for a single mailbox (no content).
 */
export async function getMailboxMessageVolume(mailboxId: string): Promise<{
  total: number;
  unread: number;
  lastReceivedAt: string | null;
}> {
  await requireAdmin();

  try {
    const { count: total } = await supabaseAdmin
      .from("test_email_messages")
      .select("*", { count: "exact", head: true })
      .eq("mailbox_id", mailboxId);

    const { count: unread } = await supabaseAdmin
      .from("test_email_messages")
      .select("*", { count: "exact", head: true })
      .eq("mailbox_id", mailboxId)
      .eq("read", false);

    const { data: latest } = await supabaseAdmin
      .from("test_email_messages")
      .select("received_at")
      .eq("mailbox_id", mailboxId)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      total: total ?? 0,
      unread: unread ?? 0,
      lastReceivedAt: latest?.received_at ?? null,
    };
  } catch (error) {
    console.error("Failed to get mailbox volume:", error);
    return { total: 0, unread: 0, lastReceivedAt: null };
  }
}

/**
 * Inbound health: event type counts over 24h and 7d.
 */
export async function getTestEmailInboundHealth(): Promise<TestEmailInboundHealth[]> {
  await requireAdmin();

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch events from the last 7 days and tally in JS
    const { data } = await supabaseAdmin
      .from("test_email_events")
      .select("event_type, created_at")
      .gte("created_at", weekAgo);

    const counts = new Map<string, { count24h: number; count7d: number }>();

    (data || []).forEach((row) => {
      const existing = counts.get(row.event_type) || { count24h: 0, count7d: 0 };
      existing.count7d++;
      if (row.created_at >= dayAgo) {
        existing.count24h++;
      }
      counts.set(row.event_type, existing);
    });

    return Array.from(counts.entries()).map(([eventType, c]) => ({
      eventType,
      count24h: c.count24h,
      count7d: c.count7d,
    }));
  } catch (error) {
    console.error("Failed to get inbound health:", error);
    return [];
  }
}

/**
 * Cleanup health: latest cleanup run + expired-but-unpurged backlog.
 */
export async function getTestEmailHealth(): Promise<TestEmailHealth> {
  await requireAdmin();

  const now = new Date().toISOString();

  try {
    const { data: latestEvent } = await supabaseAdmin
      .from("test_email_events")
      .select("created_at, detail")
      .eq("event_type", "cleanup_run")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: expiredBacklog } = await supabaseAdmin
      .from("test_email_mailboxes")
      .select("*", { count: "exact", head: true })
      .lt("expires_at", now);

    const detail = (latestEvent?.detail as { mailboxes_purged?: number; events_pruned?: number }) || {};

    return {
      latestCleanup: latestEvent
        ? {
            mailboxesPurged: detail.mailboxes_purged ?? 0,
            eventsPruned: detail.events_pruned ?? 0,
            ranAt: latestEvent.created_at,
          }
        : null,
      expiredBacklog: expiredBacklog ?? 0,
    };
  } catch (error) {
    console.error("Failed to get test email health:", error);
    return { latestCleanup: null, expiredBacklog: 0 };
  }
}

// ─── Write controls ─────────────────────────────────────────────────────────

/**
 * Force-expire a mailbox. The app's cleanup cron will purge it.
 */
export async function forceExpireMailbox(id: string): Promise<void> {
  await requireAdmin();
  const parsed = forceExpireMailboxSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }

  const { data: mailbox } = await supabaseAdmin
    .from("test_email_mailboxes")
    .select("address, user_id")
    .eq("id", id)
    .single();

  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  const { error } = await supabaseAdmin
    .from("test_email_mailboxes")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "test_email_mailbox.force_expire",
    targetType: "user",
    targetId: mailbox.user_id,
    targetName: mailbox.address,
    metadata: { mailboxId: id, address: mailbox.address },
  });
}

/**
 * Delete a mailbox immediately.
 */
export async function deleteMailbox(id: string): Promise<void> {
  await requireAdmin();
  const parsed = deleteMailboxSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0].message}`);
  }

  const { data: mailbox } = await supabaseAdmin
    .from("test_email_mailboxes")
    .select("address, user_id")
    .eq("id", id)
    .single();

  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  const { error } = await supabaseAdmin.from("test_email_mailboxes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "test_email_mailbox.delete",
    targetType: "user",
    targetId: mailbox.user_id,
    targetName: mailbox.address,
    metadata: { mailboxId: id, address: mailbox.address },
  });
}
