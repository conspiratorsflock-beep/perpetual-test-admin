import { getBillingMetrics, getRecentInvoices, getActiveCoupons, getMRRHistory } from "@/lib/actions/billing";
import { isStripeConfigured } from "@/lib/stripe/client";
import BillingDashboard, { type MRRDataPoint } from "./BillingDashboard";

export default async function BillingPage() {
  const [metrics, invoices, coupons, mrrData] = await Promise.all([
    getBillingMetrics(),
    getRecentInvoices(),
    getActiveCoupons(),
    getMRRHistory(),
  ]);

  const stripeConfigured = Boolean(isStripeConfigured);

  return (
    <BillingDashboard
      metrics={metrics}
      invoices={invoices}
      coupons={coupons}
      mrrData={mrrData}
      stripeConfigured={stripeConfigured}
    />
  );
}
