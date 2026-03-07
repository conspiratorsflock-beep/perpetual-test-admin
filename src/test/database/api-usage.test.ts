import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

// These tests require a real Supabase connection
// Skip if no service role key is available
const skipIfNoDatabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? false : true;

describe.skipIf(skipIfNoDatabase)("API Usage Database", () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  beforeAll(async () => {
    // Ensure the table exists
    const { error } = await supabase.from("api_usage_daily").select("id").limit(1);
    if (error) {
      console.warn("api_usage_daily table not found, skipping tests");
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await supabase.from("api_usage_daily").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  });

  describe("api_usage_daily table", () => {
    it("should insert and retrieve usage record", async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("api_usage_daily")
        .insert({
          date: today,
          total_calls: 100,
          unique_users: 10,
          unique_orgs: 5,
          endpoint_breakdown: { "/api/tests": 50, "/api/runs": 50 },
          status_breakdown: { "200": 95, "404": 5 },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.total_calls).toBe(100);
      expect(data.endpoint_breakdown).toEqual({ "/api/tests": 50, "/api/runs": 50 });
    });

    it("should enforce unique date constraint", async () => {
      const today = new Date().toISOString().split("T")[0];

      // Insert first record
      await supabase.from("api_usage_daily").insert({
        date: today,
        total_calls: 100,
      });

      // Try to insert duplicate
      const { error } = await supabase.from("api_usage_daily").insert({
        date: today,
        total_calls: 200,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505"); // unique_violation
    });

    it("should update existing record", async () => {
      const today = new Date().toISOString().split("T")[0];

      await supabase.from("api_usage_daily").insert({
        date: today,
        total_calls: 100,
      });

      const { data, error } = await supabase
        .from("api_usage_daily")
        .update({ total_calls: 200 })
        .eq("date", today)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.total_calls).toBe(200);
    });
  });

  describe("increment_api_calls function", () => {
    it("should increment total_calls", async () => {
      const { error } = await supabase.rpc("increment_api_calls", {
        p_endpoint: "/api/tests",
        p_status_code: 200,
        p_user_id: "user_123",
        p_org_id: "org_456",
      });

      expect(error).toBeNull();

      // Verify the record was created
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("api_usage_daily")
        .select("*")
        .eq("date", today)
        .single();

      expect(data).not.toBeNull();
      expect(data.total_calls).toBe(1);
      expect(data.endpoint_breakdown).toHaveProperty("/api/tests");
      expect(data.status_breakdown).toHaveProperty("200");
    });

    it("should handle multiple increments", async () => {
      // Call multiple times
      await supabase.rpc("increment_api_calls", {
        p_endpoint: "/api/tests",
        p_status_code: 200,
      });
      await supabase.rpc("increment_api_calls", {
        p_endpoint: "/api/tests",
        p_status_code: 200,
      });
      await supabase.rpc("increment_api_calls", {
        p_endpoint: "/api/runs",
        p_status_code: 201,
      });

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("api_usage_daily")
        .select("*")
        .eq("date", today)
        .single();

      expect(data.total_calls).toBe(3);
      expect(data.endpoint_breakdown["/api/tests"]).toBe(2);
      expect(data.endpoint_breakdown["/api/runs"]).toBe(1);
    });
  });

  describe("get_api_calls_for_range function", () => {
    it("should return data for date range", async () => {
      // Insert test data
      const dates = ["2024-03-01", "2024-03-02", "2024-03-03"];
      for (const date of dates) {
        await supabase.from("api_usage_daily").insert({
          date,
          total_calls: 100,
        });
      }

      const { data, error } = await supabase.rpc("get_api_calls_for_range", {
        start_date: "2024-03-01",
        end_date: "2024-03-03",
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
    });
  });
});
