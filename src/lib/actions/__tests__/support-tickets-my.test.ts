import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyTickets, getAgentWorkload } from "../support-tickets-my";
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

describe("Support Tickets My Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMyTickets rejects before DB call", async () => {
    await expect(getMyTickets("agent_1")).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("getAgentWorkload rejects before DB call", async () => {
    await expect(getAgentWorkload("agent_1")).rejects.toThrow("Unauthorized");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });
});
