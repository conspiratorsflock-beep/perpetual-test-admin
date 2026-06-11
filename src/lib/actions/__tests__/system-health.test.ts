import { describe, it, expect, vi, beforeEach } from "vitest";
import { runHealthChecks, getHealthCheckHistory, getLatestHealthStatus } from "../system-health";
import { supabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(async () => {
    throw new Error("Unauthorized");
  }),
}));

describe("System Health Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runHealthChecks rejects before any health check storage", async () => {
    await expect(runHealthChecks()).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("getHealthCheckHistory rejects before DB call", async () => {
    await expect(getHealthCheckHistory()).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("getLatestHealthStatus rejects before DB call", async () => {
    await expect(getLatestHealthStatus()).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });
});
