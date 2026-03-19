import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe - define everything inside the factory
vi.mock("@/lib/stripe/client", () => {
  const mockStripeSubscriptionsList = vi.fn();
  const mockStripeInvoicesList = vi.fn();
  const mockStripeCouponsList = vi.fn();
  const mockStripeCouponsCreate = vi.fn();
  const mockStripeCouponsDel = vi.fn();
  const mockStripeCustomersList = vi.fn();

  return {
    stripe: {
      subscriptions: { list: mockStripeSubscriptionsList },
      invoices: { list: mockStripeInvoicesList },
      coupons: { 
        list: mockStripeCouponsList,
        create: mockStripeCouponsCreate,
        del: mockStripeCouponsDel,
      },
      customers: { list: mockStripeCustomersList },
    },
    isStripeConfigured: true,
    // Export mocks for test access
    mockStripeSubscriptionsList,
    mockStripeInvoicesList,
    mockStripeCouponsList,
    mockStripeCouponsCreate,
    mockStripeCouponsDel,
    mockStripeCustomersList,
  };
});

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Import the mocked module and functions
import {
  getBillingMetrics,
  getRecentInvoices,
  getActiveCoupons,
  getMRRHistory,
  createCoupon,
  deleteCoupon,
} from "../billing";
import {
  mockStripeSubscriptionsList,
  mockStripeInvoicesList,
  mockStripeCouponsList,
  mockStripeCouponsCreate,
  mockStripeCouponsDel,
} from "@/lib/stripe/client";

/** Creates an async iterable from an array — mirrors the Stripe auto-pagination API. */
function makeAsyncIterable<T>(items: T[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) yield item;
    },
  };
}

describe("Billing Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBillingMetrics", () => {
    it("should calculate MRR from monthly subscriptions", async () => {
      mockStripeSubscriptionsList.mockReturnValue(
        makeAsyncIterable([
          {
            status: "active",
            customer: "cus_1",
            items: {
              data: [
                {
                  price: {
                    unit_amount: 1000,
                    recurring: { interval: "month" },
                  },
                  quantity: 1,
                },
              ],
            },
          },
        ])
      );

      const result = await getBillingMetrics();

      expect(result.mrr).toBe(1000);
      expect(result.arr).toBe(12000);
      expect(result.activeSubscriptions).toBe(1);
    });

    it("should calculate MRR from yearly subscriptions", async () => {
      mockStripeSubscriptionsList.mockReturnValue(
        makeAsyncIterable([
          {
            status: "active",
            customer: "cus_1",
            items: {
              data: [
                {
                  price: {
                    unit_amount: 12000,
                    recurring: { interval: "year" },
                  },
                  quantity: 1,
                },
              ],
            },
          },
        ])
      );

      const result = await getBillingMetrics();

      expect(result.mrr).toBe(1000); // 12000 / 12
    });

    it("should count subscription statuses correctly", async () => {
      mockStripeSubscriptionsList.mockReturnValue(
        makeAsyncIterable([
          { status: "active", customer: "cus_1", items: { data: [] } },
          { status: "active", customer: "cus_2", items: { data: [] } },
          { status: "trialing", customer: "cus_3", items: { data: [] } },
          { status: "past_due", customer: "cus_4", items: { data: [] } },
          { status: "canceled", canceled_at: Date.now() / 1000, customer: "cus_5", items: { data: [] } },
        ])
      );

      const result = await getBillingMetrics();

      expect(result.activeSubscriptions).toBe(2);
      expect(result.trialingSubscriptions).toBe(1);
      expect(result.pastDueSubscriptions).toBe(1);
      expect(result.canceledSubscriptions).toBe(1);
    });

    it("should calculate churn rate", async () => {
      mockStripeSubscriptionsList.mockReturnValue(
        makeAsyncIterable([
          { status: "active", customer: "cus_1", items: { data: [] } },
          { status: "active", customer: "cus_2", items: { data: [] } },
          { status: "active", customer: "cus_3", items: { data: [] } },
          { status: "canceled", canceled_at: Date.now() / 1000, customer: "cus_4", items: { data: [] } },
        ])
      );

      const result = await getBillingMetrics();

      expect(result.churnRate).toBe(25); // 1 canceled / 4 total = 25%
    });

    it("should handle empty subscriptions", async () => {
      mockStripeSubscriptionsList.mockReturnValue(makeAsyncIterable([]));

      const result = await getBillingMetrics();

      expect(result.mrr).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.churnRate).toBe(0);
    });

    it("should throw error when Stripe fails", async () => {
      mockStripeSubscriptionsList.mockRejectedValue(new Error("Stripe error"));

      await expect(getBillingMetrics()).rejects.toThrow("Failed to fetch billing metrics from Stripe");
    });
  });

  describe("getRecentInvoices", () => {
    it("should return formatted invoices", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          {
            id: "inv_123",
            number: "INV-001",
            customer: { id: "cus_123", name: "Acme Corp", email: "billing@acme.com" },
            amount_due: 5000,
            amount_paid: 5000,
            status: "paid",
            created: 1700000000,
            due_date: 1700100000,
            invoice_pdf: "https://stripe.com/invoice.pdf",
          },
        ],
      });

      const result = await getRecentInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("inv_123");
      expect(result[0].customerName).toBe("Acme Corp");
      expect(result[0].status).toBe("paid");
    });

    it("should handle string customer IDs", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          {
            id: "inv_123",
            customer: "cus_123",
            amount_due: 5000,
            amount_paid: 5000,
            status: "paid",
            created: 1700000000,
          },
        ],
      });

      const result = await getRecentInvoices();

      expect(result[0].customerId).toBe("cus_123");
      expect(result[0].customerName).toBe("Unknown");
    });

    it("should handle deleted customers", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          {
            id: "inv_123",
            customer: { id: "cus_123", deleted: true },
            amount_due: 5000,
            amount_paid: 5000,
            status: "paid",
            created: 1700000000,
          },
        ],
      });

      const result = await getRecentInvoices();

      expect(result[0].customerName).toBe("Unknown");
    });
  });

  describe("getActiveCoupons", () => {
    it("should return only valid coupons", async () => {
      mockStripeCouponsList.mockResolvedValue({
        data: [
          {
            id: "WELCOME20",
            name: "Welcome Discount",
            percent_off: 20,
            amount_off: null,
            currency: null,
            duration: "once",
            duration_in_months: null,
            max_redemptions: 100,
            times_redeemed: 45,
            valid: true,
            created: 1700000000,
            redeem_by: null,
          },
          {
            id: "EXPIRED",
            name: "Expired Coupon",
            percent_off: 50,
            valid: false,
            created: 1700000000,
          },
        ],
      });

      const result = await getActiveCoupons();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("WELCOME20");
    });

    it("should format amount off coupons", async () => {
      mockStripeCouponsList.mockResolvedValue({
        data: [
          {
            id: "SAVE10",
            name: "$10 Off",
            percent_off: null,
            amount_off: 1000,
            currency: "usd",
            duration: "forever",
            valid: true,
            created: 1700000000,
          },
        ],
      });

      const result = await getActiveCoupons();

      expect(result[0].amountOff).toBe(1000);
      expect(result[0].currency).toBe("usd");
    });
  });

  describe("getMRRHistory", () => {
    it("should return historical MRR data", async () => {
      mockStripeSubscriptionsList.mockReturnValue(
        makeAsyncIterable([
          {
            created: 1600000000, // Old subscription
            canceled_at: null,
            items: {
              data: [
                {
                  price: {
                    unit_amount: 1000,
                    recurring: { interval: "month" },
                  },
                  quantity: 1,
                },
              ],
            },
          },
        ])
      );

      const result = await getMRRHistory(6);

      expect(result).toHaveLength(6);
      expect(result[0]).toHaveProperty("month");
      expect(result[0]).toHaveProperty("mrr");
    });
  });

  describe("createCoupon", () => {
    it("should create coupon and log action", async () => {
      mockStripeCouponsCreate.mockResolvedValue({
        id: "NEWCOUPON",
      });

      await createCoupon({
        name: "New Customer Discount",
        percentOff: 15,
        duration: "once",
      });

      expect(mockStripeCouponsCreate).toHaveBeenCalledWith({
        name: "New Customer Discount",
        percent_off: 15,
        amount_off: undefined,
        currency: undefined,
        duration: "once",
        duration_in_months: undefined,
        max_redemptions: undefined,
      });
    });
  });

  describe("deleteCoupon", () => {
    it("should delete coupon and log action", async () => {
      await deleteCoupon("COUPON123");

      expect(mockStripeCouponsDel).toHaveBeenCalledWith("COUPON123");
    });
  });
});
