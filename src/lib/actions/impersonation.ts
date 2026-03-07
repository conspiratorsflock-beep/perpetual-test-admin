"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";

const IMPERSONATION_TOKEN_EXPIRY_MINUTES = 30;

/**
 * Generates a secure impersonation token for an admin to act as a target user.
 * Returns the plain token (to be shown once) and stores a hash in the database.
 */
export async function generateImpersonationToken(targetUserId: string): Promise<string> {
  const { userId: adminId } = await auth();
  if (!adminId) {
    throw new Error("Not authenticated");
  }

  const client = await clerkClient();

  // Get admin info
  const admin = await client.users.getUser(adminId);
  const adminEmail = admin.emailAddresses[0]?.emailAddress || "unknown";

  // Get target user info
  const targetUser = await client.users.getUser(targetUserId);
  const targetEmail = targetUser.emailAddresses[0]?.emailAddress || "unknown";

  // Generate secure random token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + IMPERSONATION_TOKEN_EXPIRY_MINUTES);

  // Store in database
  const { error } = await supabaseAdmin.from("impersonation_tokens").insert({
    token_hash: tokenHash,
    admin_id: adminId,
    admin_email: adminEmail,
    target_user_id: targetUserId,
    target_user_email: targetEmail,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create impersonation token: ${error.message}`);
  }

  // Log the action
  await logAdminAction({
    action: "impersonation.token_created",
    targetType: "user",
    targetId: targetUserId,
    targetName: targetEmail,
    metadata: {
      expiresAt: expiresAt.toISOString(),
    },
  });

  return token;
}

/**
 * Validates an impersonation token and returns the target user ID if valid.
 * Marks the token as used.
 */
export async function validateImpersonationToken(token: string): Promise<{
  valid: boolean;
  targetUserId?: string;
  adminId?: string;
  error?: string;
}> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Find the token
  const { data, error } = await supabaseAdmin
    .from("impersonation_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !data) {
    return { valid: false, error: "Invalid token" };
  }

  // Check if already used
  if (data.used_at) {
    return { valid: false, error: "Token already used" };
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "Token expired" };
  }

  // Mark as used
  await supabaseAdmin
    .from("impersonation_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    valid: true,
    targetUserId: data.target_user_id,
    adminId: data.admin_id,
  };
}

/**
 * Get impersonation history for audit purposes.
 */
export async function getImpersonationHistory(limit = 50): Promise<
  {
    id: string;
    adminEmail: string;
    targetEmail: string;
    createdAt: string;
    expiresAt: string;
    usedAt: string | null;
  }[]
> {
  const { data, error } = await supabaseAdmin
    .from("impersonation_tokens")
    .select("id, admin_email, target_user_email, created_at, expires_at, used_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch impersonation history: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    adminEmail: row.admin_email,
    targetEmail: row.target_user_email,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  }));
}
