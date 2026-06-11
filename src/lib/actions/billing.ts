"use server";

import { requireAdmin } from "@/lib/clerk/admin-check";

import { stripe, isStripeConfigured } from "@/lib/stripe/client";
import { logAdminAction } from "@/lib/audit/logger";
import type { BillingMetrics, TrialMetrics, StripeInvoice, StripeCoupon } from "@/types/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock data for when Stripe is not configured
const mockMetrics: BillingMetrics = {
  mrr: 0,
  arr: 0,
  activeSubscriptions: 0,
  activeTrials: 0,
  softLockedOrgs: 0,
  hardLockedOrgs: 0,
  paidOrgs: 0,
  trialToPaidConversionRate: 0,
  avgTimeToConversion: 0,
};

const mockMRRHistory = [
  { month: "Jan", mrr: 0 },
  { month: "Feb", mrr: 0 },
  { month: "Mar", mrr: 0 },
  { month: "Apr", mrr: 0 },
  { month: "May", mrr: 0 },
  { month: "Jun", mrr: 0 },
];

/**
 * Get billing metrics from Stripe
 */
export async function getBillingMetrics(): Promise<BillingMetrics> {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    console.warn("Stripe not configured, returning mock billing metrics");
    return mockMetrics;
  }

  try {
    let mrr = 0;
    let activeSubscriptions = 0;
    // Stripe subscription counts — kept for MRR calculation but not returned
    // as primary metric since lathe-studio uses trial_lock_state

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const customerIds = new Set<string>();

    // Paginate through all subscriptions — avoids 100-record truncation
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      // Calculate MRR from active subscriptions
      if (sub.status === "active" || sub.status === "trialing") {
        for (const item of sub.items.data) {
          const price = item.price;
          if (price?.unit_amount && price?.recurring?.interval) {
            const amount = price.unit_amount * (item.quantity || 1);
            // Convert to monthly
            if (price.recurring.interval === "month") {
              mrr += amount;
            } else if (price.recurring.interval === "year") {
              mrr += amount / 12;
            } else if (price.recurring.interval === "week") {
              mrr += amount * 4.33;
            } else if (price.recurring.interval === "day") {
              mrr += amount * 30;
            }
          }
        }
      }

      // Count by status
      if (sub.status === "active") {
        activeSubscriptions++;
      }

      customerIds.add(sub.customer as string);
    }

    // Fetch trial state distribution from lathe-studio DB
    const { data: orgStates } = await supabaseAdmin
      .from("organizations")
      .select("trial_lock_state, trial_started_at, trial_ends_at");

    let activeTrials = 0;
    let softLocked = 0;
    let hardLocked = 0;
    let paid = 0;
    let totalConversionDays = 0;
    let convertedCount = 0;

    for (const row of orgStates ?? []) {
      switch (row.trial_lock_state) {
        case "active":
          activeTrials++;
          break;
        case "soft_locked":
          softLocked++;
          break;
        case "hard_locked":
          hardLocked++;
          break;
        case "paid":
          paid++;
          if (row.trial_started_at && row.trial_ends_at) {
            const started = new Date(row.trial_started_at).getTime();
            const ended = new Date(row.trial_ends_at).getTime();
            totalConversionDays += (ended - started) / (1000 * 60 * 60 * 24);
            convertedCount++;
          }
          break;
      }
    }

    const totalOrgs = (orgStates ?? []).length;
    const conversionRate = totalOrgs > 0 ? Math.round((paid / totalOrgs) * 1000) / 10 : 0;
    const avgTimeToConversion = convertedCount > 0 ? Math.round(totalConversionDays / convertedCount) : 0;

    return {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      activeSubscriptions,
      activeTrials,
      softLockedOrgs: softLocked,
      hardLockedOrgs: hardLocked,
      paidOrgs: paid,
      trialToPaidConversionRate: conversionRate,
      avgTimeToConversion,
    };
  } catch (error) {
    console.error("Failed to get billing metrics:", error);
    throw new Error("Failed to fetch billing metrics from Stripe");
  }
}

/**
 * Get recent invoices from Stripe
 */
export async function getRecentInvoices(limit = 10): Promise<StripeInvoice[]> {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    console.warn("Stripe not configured, returning empty invoices");
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      limit,
      expand: ["data.customer"],
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || "",
      customerName:
        typeof invoice.customer === "object" && invoice.customer && !('deleted' in invoice.customer)
          ? invoice.customer.name || invoice.customer.email || "Unknown"
          : "Unknown",
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      status: invoice.status || "unknown",
      createdAt: new Date(invoice.created * 1000).toISOString(),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      pdfUrl: invoice.invoice_pdf || null,
    }));
  } catch (error) {
    console.error("Failed to get invoices:", error);
    throw new Error("Failed to fetch invoices from Stripe");
  }
}

/**
 * Get active coupons from Stripe
 */
export async function getActiveCoupons(): Promise<StripeCoupon[]> {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    console.warn("Stripe not configured, returning empty coupons");
    return [];
  }

  try {
    const coupons = await stripe.coupons.list({
      limit: 100,
    });

    return coupons.data
      .filter((coupon) => coupon.valid)
      .map((coupon) => ({
        id: coupon.id,
        name: coupon.name,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months,
        maxRedemptions: coupon.max_redemptions,
        timesRedeemed: coupon.times_redeemed,
        valid: coupon.valid,
        createdAt: new Date(coupon.created * 1000).toISOString(),
        redeemBy: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
      }));
  } catch (error) {
    console.error("Failed to get coupons:", error);
    throw new Error("Failed to fetch coupons from Stripe");
  }
}

/**
 * Get MRR history for chart data
 */
export async function getMRRHistory(months = 6): Promise<{ month: string; mrr: number }[]> {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    console.warn("Stripe not configured, returning mock MRR history");
    return mockMRRHistory.slice(-months);
  }

  try {
    // Paginate through all subscriptions — avoids 100-record truncation
    const allSubs: Awaited<ReturnType<typeof stripe.subscriptions.list>>["data"] = [];
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      allSubs.push(sub);
    }

    const now = new Date();
    const history: { month: string; mrr: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthTimestamp = Math.floor(monthEnd.getTime() / 1000);

      let monthMrr = 0;

      for (const sub of allSubs) {
        // Only count subscriptions that were active at this point in time
        if (sub.created <= monthTimestamp && (!sub.canceled_at || sub.canceled_at > monthTimestamp)) {
          for (const item of sub.items.data) {
            const price = item.price;
            if (price?.unit_amount && price?.recurring?.interval) {
              const amount = price.unit_amount * (item.quantity || 1);
              if (price.recurring.interval === "month") {
                monthMrr += amount;
              } else if (price.recurring.interval === "year") {
                monthMrr += amount / 12;
              } else if (price.recurring.interval === "week") {
                monthMrr += amount * 4.33;
              } else if (price.recurring.interval === "day") {
                monthMrr += amount * 30;
              }
            }
          }
        }
      }

      history.push({
        month: date.toLocaleString("default", { month: "short" }),
        mrr: Math.round(monthMrr),
      });
    }

    return history;
  } catch (error) {
    console.error("Failed to get MRR history:", error);
    throw new Error("Failed to fetch MRR history from Stripe");
  }
}

/**
 * Create a new coupon
 */
export async function createCoupon(params: {
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
}) {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment.");
  }

  try {
    const coupon = await stripe.coupons.create({
      name: params.name,
      percent_off: params.percentOff,
      amount_off: params.amountOff,
      currency: params.amountOff ? params.currency : undefined,
      duration: params.duration,
      duration_in_months: params.durationInMonths,
      max_redemptions: params.maxRedemptions,
    });

    await logAdminAction({
      action: "billing.coupon.create",
      targetType: "billing",
      targetId: coupon.id,
      targetName: params.name,
      metadata: { params },
    });

    return { success: true, couponId: coupon.id };
  } catch (error) {
    console.error("Failed to create coupon:", error);
    throw new Error("Failed to create coupon in Stripe");
  }
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(couponId: string) {
  await requireAdmin();
  if (!isStripeConfigured || !stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment.");
  }

  try {
    await stripe.coupons.del(couponId);

    await logAdminAction({
      action: "billing.coupon.delete",
      targetType: "billing",
      targetId: couponId,
      metadata: {},
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete coupon:", error);
    throw new Error("Failed to delete coupon in Stripe");
  }
}
