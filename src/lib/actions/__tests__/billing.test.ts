import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBillingMetrics,
  getRecentInvoices,
  getActiveCoupons,
  getMRRHistory,
  createCoupon,
  deleteCoupon,
} from "../billing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/stripe/client", () => ({
  isStripeConfigured: true,
  stripe: {
    subscriptions: { list: vi.fn() },
    invoices: { list: vi.fn() },
    coupons: {
      list: vi.fn(),
      create: vi.fn(),
      del: vi.fn(),
    },
  },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(async () => {
    throw new Error("Unauthorized");
  }),
}));

describe("Billing Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBillingMetrics rejects before Stripe/Supabase call", async () => {
    await expect(getBillingMetrics()).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).subscriptions.list).not.toHaveBeenCalled();
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("getRecentInvoices rejects before Stripe call", async () => {
    await expect(getRecentInvoices()).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).invoices.list).not.toHaveBeenCalled();
  });

  it("getActiveCoupons rejects before Stripe call", async () => {
    await expect(getActiveCoupons()).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).coupons.list).not.toHaveBeenCalled();
  });

  it("getMRRHistory rejects before Stripe call", async () => {
    await expect(getMRRHistory()).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).subscriptions.list).not.toHaveBeenCalled();
  });

  it("createCoupon rejects before Stripe call", async () => {
    await expect(
      createCoupon({ name: "Test", duration: "once" })
    ).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).coupons.create).not.toHaveBeenCalled();
  });

  it("deleteCoupon rejects before Stripe call", async () => {
    await expect(deleteCoupon("coupon_1")).rejects.toThrow("Unauthorized");
    expect((stripe as NonNullable<typeof stripe>).coupons.del).not.toHaveBeenCalled();
  });
});
