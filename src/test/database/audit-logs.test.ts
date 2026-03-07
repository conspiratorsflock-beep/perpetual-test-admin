import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Database integration tests for audit logging
 * These tests require a running Supabase instance
 */
describe.skip("Database: Audit Logs (Integration)", () => {
  const testAdminId = "test_admin_123";
  const testTargetId = "test_target_456";

  beforeAll(async () => {
    // Clean up test data
    await supabaseAdmin
      .from("admin_audit_logs")
      .delete()
      .eq("admin_id", testAdminId);
  });

  afterAll(async () => {
    // Clean up test data
    await supabaseAdmin
      .from("admin_audit_logs")
      .delete()
      .eq("admin_id", testAdminId);
  });

  it("should insert audit log", async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_id: testAdminId,
        admin_email: "test@example.com",
        action: "user.update",
        target_type: "user",
        target_id: testTargetId,
        target_name: "Test User",
        metadata: { field: "name", oldValue: "Old", newValue: "New" },
        ip_address: "127.0.0.1",
        user_agent: "Test Agent",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.action).toBe("user.update");
    expect(data.target_type).toBe("user");
  });

  it("should query audit logs by target", async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*")
      .eq("target_type", "user")
      .eq("target_id", testTargetId)
      .order("created_at", { ascending: false });

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("should query audit logs by admin", async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*")
      .eq("admin_id", testAdminId);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it("should enforce target_type check constraint", async () => {
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: testAdminId,
      admin_email: "test@example.com",
      action: "test.action",
      target_type: "invalid_type", // Should fail
      target_id: testTargetId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("check constraint");
  });

  it("should support pagination", async () => {
    // Insert multiple logs
    for (let i = 0; i < 5; i++) {
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_id: testAdminId,
        admin_email: "test@example.com",
        action: `test.action.${i}`,
        target_type: "user",
        target_id: testTargetId,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*", { count: "exact" })
      .eq("admin_id", testAdminId)
      .order("created_at", { ascending: false })
      .range(0, 2);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });
});
