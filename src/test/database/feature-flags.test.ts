import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Database integration tests for feature flags
 */
describe.skip("Database: Feature Flags (Integration)", () => {
  const testFlagKey = `test_flag_${Date.now()}`;

  beforeAll(async () => {
    // Clean up
    await supabaseAdmin.from("feature_flags").delete().eq("key", testFlagKey);
  });

  afterAll(async () => {
    // Clean up
    await supabaseAdmin.from("feature_flags").delete().eq("key", testFlagKey);
  });

  it("should create feature flag", async () => {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .insert({
        key: testFlagKey,
        name: "Test Feature",
        description: "A test feature flag",
        enabled_globally: false,
        enabled_for_orgs: [],
        enabled_for_users: [],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.key).toBe(testFlagKey);
    expect(data.enabled_globally).toBe(false);
  });

  it("should enforce unique key constraint", async () => {
    const { error } = await supabaseAdmin.from("feature_flags").insert({
      key: testFlagKey, // Duplicate
      name: "Duplicate",
      enabled_globally: false,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("duplicate");
  });

  it("should update feature flag", async () => {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .update({
        enabled_globally: true,
        name: "Updated Name",
      })
      .eq("key", testFlagKey)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.enabled_globally).toBe(true);
    expect(data.name).toBe("Updated Name");
  });

  it("should add org to enabled list", async () => {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .update({
        enabled_for_orgs: ["org_1", "org_2"],
      })
      .eq("key", testFlagKey)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.enabled_for_orgs).toContain("org_1");
    expect(data.enabled_for_orgs).toContain("org_2");
  });

  it("should check feature enabled via RPC", async () => {
    // First enable globally
    await supabaseAdmin
      .from("feature_flags")
      .update({ enabled_globally: true })
      .eq("key", testFlagKey);

    const { data, error } = await supabaseAdmin.rpc("is_feature_enabled", {
      flag_key: testFlagKey,
      user_id: null,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("should check feature disabled when not enabled", async () => {
    const uniqueKey = `disabled_flag_${Date.now()}`;
    await supabaseAdmin.from("feature_flags").insert({
      key: uniqueKey,
      name: "Disabled Feature",
      enabled_globally: false,
    });

    const { data, error } = await supabaseAdmin.rpc("is_feature_enabled", {
      flag_key: uniqueKey,
      user_id: "user_123",
      org_id: "org_123",
    });

    expect(error).toBeNull();
    expect(data).toBe(false);

    // Clean up
    await supabaseAdmin.from("feature_flags").delete().eq("key", uniqueKey);
  });

  it("should check feature enabled for specific user", async () => {
    const userId = "test_user_123";
    
    await supabaseAdmin
      .from("feature_flags")
      .update({
        enabled_globally: false,
        enabled_for_users: [userId],
      })
      .eq("key", testFlagKey);

    const { data, error } = await supabaseAdmin.rpc("is_feature_enabled", {
      flag_key: testFlagKey,
      user_id: userId,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("should delete feature flag", async () => {
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .delete()
      .eq("key", testFlagKey);

    expect(error).toBeNull();

    // Verify deletion
    const { data } = await supabaseAdmin
      .from("feature_flags")
      .select()
      .eq("key", testFlagKey)
      .single();

    expect(data).toBeNull();
  });
});
