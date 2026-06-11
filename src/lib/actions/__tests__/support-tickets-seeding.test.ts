import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUnassignedTickets, getAvailableAgents, seedUnassignedTickets } from "../support-tickets-seeding";
import { supabaseAdmin, supabaseAdminUntyped } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/logger";
import { requireAdmin } from "@/lib/clerk/admin-check";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
  supabaseAdminUntyped: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(async () => {
    throw new Error("Unauthorized");
  }),
}));

describe("Support Tickets Seeding Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUnassignedTickets rejects before DB call", async () => {
    await expect(getUnassignedTickets([])).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("getAvailableAgents rejects before DB call", async () => {
    await expect(getAvailableAgents()).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(supabaseAdminUntyped.rpc).not.toHaveBeenCalled();
  });

  it("seedUnassignedTickets rejects before DB call", async () => {
    await expect(
      seedUnassignedTickets({
        categories: [],
        strategy: "round_robin",
        respectSchedule: false,
        maxPerAgent: 5,
      })
    ).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("seedUnassignedTickets rejects invalid input before DB call", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(undefined);
    await expect(
      seedUnassignedTickets({
        categories: [],
        strategy: "invalid_strategy" as unknown as "round_robin",
        respectSchedule: false,
        maxPerAgent: 5,
      })
    ).rejects.toThrow("Invalid input");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});
