import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BillingDashboard from "../BillingDashboard";

const mockMetrics = {
  mrr: 50000,
  arr: 600000,
  activeSubscriptions: 100,
  activeTrials: 10,
  softLockedOrgs: 2,
  hardLockedOrgs: 1,
  paidOrgs: 95,
  trialToPaidConversionRate: 25,
  avgTimeToConversion: 45,
};

const mockInvoices = [
  {
    id: "inv_1",
    number: "INV-001",
    customerId: "cus_1",
    customerName: "Acme Corp",
    amountDue: 50000,
    amountPaid: 50000,
    status: "paid",
    createdAt: "2024-03-15T10:00:00Z",
    dueDate: "2024-03-30T00:00:00Z",
    pdfUrl: "https://stripe.com/invoice.pdf",
  },
];

const mockCoupons = [
  {
    id: "WELCOME20",
    name: "Welcome Discount",
    percentOff: 20,
    amountOff: null,
    currency: null,
    duration: "once",
    durationInMonths: null,
    maxRedemptions: 100,
    timesRedeemed: 45,
    valid: true,
    createdAt: "2024-01-01T00:00:00Z",
    redeemBy: null,
  },
];

const mockMrrData = [
  { month: "Jan", mrr: 45000 },
  { month: "Feb", mrr: 48000 },
  { month: "Mar", mrr: 50000 },
];

const { mockStripeConfig } = vi.hoisted(() => ({
  mockStripeConfig: { isStripeConfigured: false as string | false },
}));

vi.mock("@/lib/actions/billing", () => ({
  getBillingMetrics: vi.fn(),
  getRecentInvoices: vi.fn(),
  getActiveCoupons: vi.fn(),
  getMRRHistory: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  get isStripeConfigured() {
    return mockStripeConfig.isStripeConfigured;
  },
}));

import {
  getBillingMetrics,
  getRecentInvoices,
  getActiveCoupons,
  getMRRHistory,
} from "@/lib/actions/billing";

const mockGetBillingMetrics = vi.mocked(getBillingMetrics);
const mockGetRecentInvoices = vi.mocked(getRecentInvoices);
const mockGetActiveCoupons = vi.mocked(getActiveCoupons);
const mockGetMRRHistory = vi.mocked(getMRRHistory);

describe("BillingDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the Stripe not configured alert and empty cells when configured is false", async () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={[]}
        coupons={[]}
        mrrData={mockMrrData}
        stripeConfigured={false}
      />
    );

    expect(screen.getByText("Stripe Not Configured")).toBeInTheDocument();
    expect(screen.getByText("Stripe not configured.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));
    expect(screen.getByText("Stripe not configured.")).toBeInTheDocument();
  });

  it("shows 'No invoices found.' and 'No active coupons found.' when configured is true with zero data", async () => {
    render(
      <BillingDashboard
        metrics={{ ...mockMetrics, mrr: 0 }}
        invoices={[]}
        coupons={[]}
        mrrData={[
          { month: "Jan", mrr: 0 },
          { month: "Feb", mrr: 0 },
        ]}
        stripeConfigured={true}
      />
    );

    expect(screen.queryByText("Stripe Not Configured")).not.toBeInTheDocument();
    expect(screen.getByText("No invoices found.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));
    expect(screen.getByText("No active coupons found.")).toBeInTheDocument();
  });

  it("renders stat values and positive MRR growth badge for populated data", () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={mockInvoices}
        coupons={mockCoupons}
        mrrData={mockMrrData}
        stripeConfigured={true}
      />
    );

    expect(screen.getByText("$50,000")).toBeInTheDocument();
    expect(screen.getByText("$600,000")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText(/4\.2/)).toBeInTheDocument();
  });

  it("renders invoices in the invoices tab", () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={mockInvoices}
        coupons={[]}
        mrrData={mockMrrData}
        stripeConfigured={true}
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    const invoiceRow = screen.getByText("Acme Corp").closest("tr");
    expect(invoiceRow).not.toBeNull();
    expect(invoiceRow!.textContent).toContain("paid");
  });

  it("renders coupons in the coupons tab", async () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={[]}
        coupons={mockCoupons}
        mrrData={mockMrrData}
        stripeConfigured={true}
      />
    );

    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));

    expect(screen.getByText("WELCOME20")).toBeInTheDocument();
    expect(screen.getByText("Welcome Discount")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
  });

  it("shows conversion rate badge", () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={[]}
        coupons={[]}
        mrrData={mockMrrData}
        stripeConfigured={true}
      />
    );

    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("formats amount-off coupons correctly", async () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={[]}
        coupons={[
          {
            id: "SAVE10",
            name: "$10 Off",
            percentOff: null,
            amountOff: 1000,
            currency: "usd",
            duration: "repeating",
            durationInMonths: 3,
            maxRedemptions: null,
            timesRedeemed: 25,
            valid: true,
            createdAt: "2024-01-01T00:00:00Z",
            redeemBy: null,
          },
        ]}
        mrrData={mockMrrData}
        stripeConfigured={true}
      />
    );

    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));

    expect(screen.getByText("$10.00 off")).toBeInTheDocument();
    expect(screen.getByText("3 months")).toBeInTheDocument();
  });

  it("renders negative MRR growth badge when MRR declines", () => {
    render(
      <BillingDashboard
        metrics={mockMetrics}
        invoices={[]}
        coupons={[]}
        mrrData={[
          { month: "Jan", mrr: 50000 },
          { month: "Feb", mrr: 45000 },
        ]}
        stripeConfigured={true}
      />
    );

    expect(screen.getByText(/10\.0/)).toBeInTheDocument();
  });
});

describe("BillingPage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetBillingMetrics.mockResolvedValue(mockMetrics);
    mockGetRecentInvoices.mockResolvedValue(mockInvoices);
    mockGetActiveCoupons.mockResolvedValue(mockCoupons);
    mockGetMRRHistory.mockResolvedValue(mockMrrData);
  });

  it("forwards stripeConfigured=true when Stripe is configured", async () => {
    mockStripeConfig.isStripeConfigured = "sk_test_abc";

    const { default: BillingPageConfigured } = await import("../page");
    const result = await BillingPageConfigured();
    const { container } = render(result);

    expect(container.textContent).toContain("Billing Dashboard");
    expect(screen.queryByText("Stripe Not Configured")).not.toBeInTheDocument();
  });

  it("forwards stripeConfigured=false when Stripe is not configured", async () => {
    mockStripeConfig.isStripeConfigured = false;

    const { default: BillingPageUnconfigured } = await import("../page");
    const result = await BillingPageUnconfigured();
    render(result);

    expect(screen.getByText("Stripe Not Configured")).toBeInTheDocument();
  });
});
