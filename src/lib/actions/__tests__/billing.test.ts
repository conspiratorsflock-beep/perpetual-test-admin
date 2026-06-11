import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getBillingMetrics,
  getRecentInvoices,
  getActiveCoupons,
  getMRRHistory,
  createCoupon,
  deleteCoupon,
} from "../billing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe, isStripeConfigured } from "@/lib/stripe/client";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@/lib/stripe/client", () => {
  const mockSubscriptionsList = vi.fn();
  const mockInvoicesList = vi.fn();
  const mockCouponsList = vi.fn();
  const mockCouponsCreate = vi.fn();
  const mockCouponsDel = vi.fn();

  function configured() {
    const key = process.env.STRIPE_SECRET_KEY;
    return !!(key && key !== "sk_test_placeholder" && key.startsWith("sk_"));
  }

  return {
    get isStripeConfigured() {
      return configured();
    },
    get stripe() {
      if (!configured()) return null;
      return {
        subscriptions: { list: mockSubscriptionsList },
        invoices: { list: mockInvoicesList },
        coupons: {
          list: mockCouponsList,
          create: mockCouponsCreate,
          del: mockCouponsDel,
        },
      };
    },
  };
});

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

function stripeMocks() {
  const s = stripe;
  if (!s) {
    return {
      subscriptionsList: vi.fn(),
      invoicesList: vi.fn(),
      couponsList: vi.fn(),
      couponsCreate: vi.fn(),
      couponsDel: vi.fn(),
    };
  }
  return {
    subscriptionsList: s.subscriptions.list as ReturnType<typeof vi.fn>,
    invoicesList: s.invoices.list as ReturnType<typeof vi.fn>,
    couponsList: s.coupons.list as ReturnType<typeof vi.fn>,
    couponsCreate: s.coupons.create as ReturnType<typeof vi.fn>,
    couponsDel: s.coupons.del as ReturnType<typeof vi.fn>,
  };
}

describe("Billing Actions — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it("getBillingMetrics rejects before Stripe/Supabase call", async () => {
    await expect(getBillingMetrics()).rejects.toThrow("Unauthorized");
    expect(stripeMocks().subscriptionsList).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("getRecentInvoices rejects before Stripe call", async () => {
    await expect(getRecentInvoices()).rejects.toThrow("Unauthorized");
    expect(stripeMocks().invoicesList).not.toHaveBeenCalled();
  });

  it("getActiveCoupons rejects before Stripe call", async () => {
    await expect(getActiveCoupons()).rejects.toThrow("Unauthorized");
    expect(stripeMocks().couponsList).not.toHaveBeenCalled();
  });

  it("getMRRHistory rejects before Stripe call", async () => {
    await expect(getMRRHistory()).rejects.toThrow("Unauthorized");
    expect(stripeMocks().subscriptionsList).not.toHaveBeenCalled();
  });

  it("createCoupon rejects before Stripe call", async () => {
    await expect(createCoupon({ name: "Test", duration: "once" })).rejects.toThrow("Unauthorized");
    expect(stripeMocks().couponsCreate).not.toHaveBeenCalled();
  });

  it("deleteCoupon rejects before Stripe call", async () => {
    await expect(deleteCoupon("coupon_1")).rejects.toThrow("Unauthorized");
    expect(stripeMocks().couponsDel).not.toHaveBeenCalled();
  });
});

describe("Billing Actions — Stripe unconfigured", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    process.env.STRIPE_SECRET_KEY = "";
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalKey;
  });

  it("getBillingMetrics returns zero mock metrics", async () => {
    const result = await getBillingMetrics();
    expect(result).toEqual({
      mrr: 0,
      arr: 0,
      activeSubscriptions: 0,
      activeTrials: 0,
      softLockedOrgs: 0,
      hardLockedOrgs: 0,
      paidOrgs: 0,
      trialToPaidConversionRate: 0,
      avgTimeToConversion: 0,
    });
  });

  it("getRecentInvoices returns empty array", async () => {
    const result = await getRecentInvoices();
    expect(result).toEqual([]);
  });

  it("getActiveCoupons returns empty array", async () => {
    const result = await getActiveCoupons();
    expect(result).toEqual([]);
  });

  it("getMRRHistory returns sliced mock history", async () => {
    const result = await getMRRHistory(3);
    expect(result).toEqual([
      { month: "Apr", mrr: 0 },
      { month: "May", mrr: 0 },
      { month: "Jun", mrr: 0 },
    ]);
  });

  it("createCoupon throws Stripe not configured", async () => {
    await expect(createCoupon({ name: "Test", duration: "once" })).rejects.toThrow(
      "Stripe is not configured"
    );
  });

  it("deleteCoupon throws Stripe not configured", async () => {
    await expect(deleteCoupon("coupon_1")).rejects.toThrow("Stripe is not configured");
  });
});

describe("Billing Actions — Stripe configured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
    process.env.STRIPE_SECRET_KEY = "sk_test_secret";
  });

  describe("getBillingMetrics", () => {
    it("computes MRR, ARR and trial counts from Stripe + Supabase", async () => {
      const { subscriptionsList } = stripeMocks();
      const subs = [
        {
          status: "active",
          created: 0,
          canceled_at: null,
          items: {
            data: [
              {
                quantity: 2,
                price: {
                  unit_amount: 1000,
                  recurring: { interval: "month" },
                },
              },
              {
                quantity: 1,
                price: {
                  unit_amount: 12000,
                  recurring: { interval: "year" },
                },
              },
            ],
          },
        },
        {
          status: "trialing",
          created: 0,
          canceled_at: null,
          items: {
            data: [
              {
                quantity: 1,
                price: {
                  unit_amount: 500,
                  recurring: { interval: "week" },
                },
              },
            ],
          },
        },
      ];
      subscriptionsList.mockReturnValue({
        data: subs,
        [Symbol.asyncIterator]: async function* () {
          for (const sub of subs) yield sub;
        },
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn(() =>
              Promise.resolve({
                data: [
                  { trial_lock_state: "active" },
                  { trial_lock_state: "soft_locked" },
                  { trial_lock_state: "hard_locked" },
                  {
                    trial_lock_state: "paid",
                    trial_started_at: "2024-01-01T00:00:00Z",
                    trial_ends_at: "2024-01-11T00:00:00Z",
                  },
                ],
                error: null,
              })
            ),
          };
        }
        return {};
      });

      const result = await getBillingMetrics();

      // MRR: 2*1000 (month) + 12000/12 (year) + 1*500*4.33 (week) = 2000 + 1000 + 2165 = 5165
      expect(result.mrr).toBe(5165);
      expect(result.arr).toBe(61980);
      expect(result.activeSubscriptions).toBe(1);
      expect(result.activeTrials).toBe(1);
      expect(result.softLockedOrgs).toBe(1);
      expect(result.hardLockedOrgs).toBe(1);
      expect(result.paidOrgs).toBe(1);
      expect(result.trialToPaidConversionRate).toBe(25); // 1 paid / 4 orgs = 25%
      expect(result.avgTimeToConversion).toBe(10); // 10 days
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Stripe error", async () => {
      stripeMocks().subscriptionsList.mockRejectedValue(new Error("Stripe down"));
      await expect(getBillingMetrics()).rejects.toThrow("Failed to fetch billing metrics from Stripe");
    });
  });

  describe("getRecentInvoices", () => {
    it("maps Stripe invoices to admin type", async () => {
      stripeMocks().invoicesList.mockResolvedValue({
        data: [
          {
            id: "inv_1",
            number: "INV-001",
            customer: { id: "cus_1", name: "Acme", email: "acme@example.com" },
            amount_due: 10000,
            amount_paid: 10000,
            status: "paid",
            created: 1704067200,
            due_date: 1706659200,
            invoice_pdf: "https://pdf",
          },
          {
            id: "inv_2",
            number: "INV-002",
            customer: "cus_2",
            amount_due: 5000,
            amount_paid: 0,
            status: "open",
            created: 1704067200,
            due_date: null,
            invoice_pdf: null,
          },
        ],
      });

      const result = await getRecentInvoices(5);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "inv_1",
        customerId: "cus_1",
        customerName: "Acme",
        amountDue: 10000,
        amountPaid: 10000,
        status: "paid",
        dueDate: "2024-01-31T00:00:00.000Z",
        pdfUrl: "https://pdf",
      });
      expect(result[1]).toMatchObject({
        id: "inv_2",
        customerId: "cus_2",
        customerName: "Unknown",
        status: "open",
        dueDate: null,
        pdfUrl: null,
      });
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Stripe error", async () => {
      stripeMocks().invoicesList.mockRejectedValue(new Error("Stripe down"));
      await expect(getRecentInvoices()).rejects.toThrow("Failed to fetch invoices from Stripe");
    });
  });

  describe("getActiveCoupons", () => {
    it("filters and maps valid coupons", async () => {
      stripeMocks().couponsList.mockResolvedValue({
        data: [
          {
            id: "c1",
            name: "Summer Sale",
            percent_off: 20,
            amount_off: null,
            currency: null,
            duration: "once",
            duration_in_months: null,
            max_redemptions: 100,
            times_redeemed: 5,
            valid: true,
            created: 1704067200,
            redeem_by: null,
          },
          {
            id: "c2",
            name: "Expired",
            percent_off: null,
            amount_off: 500,
            currency: "usd",
            duration: "repeating",
            duration_in_months: 3,
            max_redemptions: null,
            times_redeemed: 10,
            valid: false,
            created: 1704067200,
            redeem_by: 1706745600,
          },
        ],
      });

      const result = await getActiveCoupons();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "c1",
        name: "Summer Sale",
        percentOff: 20,
        amountOff: null,
        currency: null,
        duration: "once",
        durationInMonths: null,
        maxRedemptions: 100,
        timesRedeemed: 5,
        valid: true,
      });
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("throws on Stripe error", async () => {
      stripeMocks().couponsList.mockRejectedValue(new Error("Stripe down"));
      await expect(getActiveCoupons()).rejects.toThrow("Failed to fetch coupons from Stripe");
    });
  });

  describe("getMRRHistory", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2024-06-15T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("computes monthly MRR for requested window", async () => {
      const subs = [
        {
          created: 0,
          canceled_at: null,
          items: {
            data: [
              {
                quantity: 1,
                price: {
                  unit_amount: 1000,
                  recurring: { interval: "month" },
                },
              },
            ],
          },
        },
      ];
      stripeMocks().subscriptionsList.mockReturnValue({
        data: subs,
        [Symbol.asyncIterator]: async function* () {
          for (const sub of subs) yield sub;
        },
      });

      const result = await getMRRHistory(3);

      expect(result).toEqual([
        { month: "Apr", mrr: 1000 },
        { month: "May", mrr: 1000 },
        { month: "Jun", mrr: 1000 },
      ]);
    });

    it("throws on Stripe error", async () => {
      stripeMocks().subscriptionsList.mockRejectedValue(new Error("Stripe down"));
      await expect(getMRRHistory()).rejects.toThrow("Failed to fetch MRR history from Stripe");
    });
  });

  describe("createCoupon", () => {
    it("creates coupon, logs audit, and returns couponId", async () => {
      stripeMocks().couponsCreate.mockResolvedValue({ id: "coupon_new" });

      const result = await createCoupon({
        name: "Launch Discount",
        percentOff: 15,
        duration: "once",
      });

      expect(stripeMocks().couponsCreate).toHaveBeenCalledWith({
        name: "Launch Discount",
        percent_off: 15,
        amount_off: undefined,
        currency: undefined,
        duration: "once",
        duration_in_months: undefined,
        max_redemptions: undefined,
      });
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "billing.coupon.create",
        targetType: "billing",
        targetId: "coupon_new",
        targetName: "Launch Discount",
        metadata: { params: { name: "Launch Discount", percentOff: 15, duration: "once" } },
      });
      expect(result).toEqual({ success: true, couponId: "coupon_new" });
    });

    it("throws on Stripe error", async () => {
      stripeMocks().couponsCreate.mockRejectedValue(new Error("Stripe down"));
      await expect(createCoupon({ name: "Bad", duration: "once" })).rejects.toThrow(
        "Failed to create coupon in Stripe"
      );
    });
  });

  describe("deleteCoupon", () => {
    it("deletes coupon and logs audit", async () => {
      stripeMocks().couponsDel.mockResolvedValue({ deleted: true });

      const result = await deleteCoupon("coupon_old");

      expect(stripeMocks().couponsDel).toHaveBeenCalledWith("coupon_old");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "billing.coupon.delete",
        targetType: "billing",
        targetId: "coupon_old",
        metadata: {},
      });
      expect(result).toEqual({ success: true });
    });

    it("throws on Stripe error", async () => {
      stripeMocks().couponsDel.mockRejectedValue(new Error("Stripe down"));
      await expect(deleteCoupon("coupon_bad")).rejects.toThrow("Failed to delete coupon in Stripe");
    });
  });
});
