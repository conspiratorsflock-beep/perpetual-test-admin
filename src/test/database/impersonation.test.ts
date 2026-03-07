import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Database integration tests for impersonation tokens
 */
describe.skip("Database: Impersonation Tokens (Integration)", () => {
  const testAdminId = `test_admin_${Date.now()}`;
  const testTargetId = `test_target_${Date.now()}`;
  const testToken = `test_token_${Date.now()}`;
  const tokenHash = createHash("sha256").update(testToken).digest("hex");

  beforeAll(async () => {
    // Clean up
    await supabaseAdmin
      .from("impersonation_tokens")
      .delete()
      .eq("admin_id", testAdminId);
  });

  afterAll(async () => {
    // Clean up
    await supabaseAdmin
      .from("impersonation_tokens")
      .delete()
      .eq("admin_id", testAdminId);
  });

  it("should create impersonation token", async () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .insert({
        token_hash: tokenHash,
        admin_id: testAdminId,
        admin_email: "admin@test.com",
        target_user_id: testTargetId,
        target_user_email: "user@test.com",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.token_hash).toBe(tokenHash);
    expect(data.used_at).toBeNull();
  });

  it("should enforce unique token_hash constraint", async () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { error } = await supabaseAdmin.from("impersonation_tokens").insert({
      token_hash: tokenHash, // Duplicate
      admin_id: testAdminId,
      admin_email: "admin@test.com",
      target_user_id: testTargetId,
      target_user_email: "user@test.com",
      expires_at: expiresAt.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("duplicate");
  });

  it("should find token by hash", async () => {
    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.admin_id).toBe(testAdminId);
    expect(data.target_user_id).toBe(testTargetId);
  });

  it("should mark token as used", async () => {
    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.used_at).not.toBeNull();
  });

  it("should query tokens by admin", async () => {
    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .select("*")
      .eq("admin_id", testAdminId);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("should query tokens by target user", async () => {
    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .select("*")
      .eq("target_user_id", testTargetId);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("should filter expired tokens", async () => {
    const expiredToken = `expired_token_${Date.now()}`;
    const expiredHash = createHash("sha256").update(expiredToken).digest("hex");
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() - 10); // 10 minutes ago

    await supabaseAdmin.from("impersonation_tokens").insert({
      token_hash: expiredHash,
      admin_id: testAdminId,
      admin_email: "admin@test.com",
      target_user_id: testTargetId,
      target_user_email: "user@test.com",
      expires_at: expiredAt.toISOString(),
    });

    const { data, error } = await supabaseAdmin
      .from("impersonation_tokens")
      .select("*")
      .eq("admin_id", testAdminId)
      .lt("expires_at", new Date().toISOString());

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.some((t) => t.token_hash === expiredHash)).toBe(true);

    // Clean up
    await supabaseAdmin.from("impersonation_tokens").delete().eq("token_hash", expiredHash);
  });

  it("should delete token", async () => {
    const { error } = await supabaseAdmin
      .from("impersonation_tokens")
      .delete()
      .eq("token_hash", tokenHash);

    expect(error).toBeNull();

    // Verify deletion
    const { data } = await supabaseAdmin
      .from("impersonation_tokens")
      .select()
      .eq("token_hash", tokenHash)
      .single();

    expect(data).toBeNull();
  });
});
