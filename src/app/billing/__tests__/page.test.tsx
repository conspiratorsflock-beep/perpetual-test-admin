import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingPage from "../page";

// Mock the billing actions
vi.mock("@/lib/actions/billing", () => ({
  getBillingMetrics: vi.fn(),
  getRecentInvoices: vi.fn(),
  getActiveCoupons: vi.fn(),
  getMRRHistory: vi.fn(),
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

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetBillingMetrics.mockResolvedValue({
      mrr: 50000,
      arr: 600000,
      activeSubscriptions: 100,
      activeTrials: 10,
      softLockedOrgs: 2,
      hardLockedOrgs: 1,
      paidOrgs: 95,
      trialToPaidConversionRate: 25,
      avgTimeToConversion: 45,
    });

    mockGetRecentInvoices.mockResolvedValue([
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
    ]);

    mockGetActiveCoupons.mockResolvedValue([
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
    ]);

    mockGetMRRHistory.mockResolvedValue([
      { month: "Jan", mrr: 45000 },
      { month: "Feb", mrr: 48000 },
      { month: "Mar", mrr: 50000 },
    ]);
  });

  it("should display loading state initially", () => {
    render(<BillingPage />);

    // Check for the loading spinner (Loader2 icon has animate-spin class)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it("should display billing metrics after loading", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText("$50,000")).toBeInTheDocument();
    });

    expect(screen.getByText("$600,000")).toBeInTheDocument();
    // The "Trial / Paid" card renders activeTrials / paidOrgs, not activeSubscriptions
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("should display MRR growth indicator", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      // The MRR growth badge shows the percentage with % symbol
      expect(screen.getByText(/4\.2/)).toBeInTheDocument();
    });
  });

  it("should display invoices in the invoices tab", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    // Check for the customer name and paid status (scoped to the invoice row to avoid multiple matches)
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    const invoiceRow = screen.getByText("Acme Corp").closest("tr");
    expect(invoiceRow).not.toBeNull();
    expect(invoiceRow!.textContent).toContain("paid");
  });

  it("should display coupons in the coupons tab", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText(/coupons/i)).toBeInTheDocument();
    });

    // Click on Coupons tab
    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));

    await waitFor(() => {
      expect(screen.getByText("WELCOME20")).toBeInTheDocument();
    });

    expect(screen.getByText("Welcome Discount")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
  });

  it("should display error state when data fetch fails", async () => {
    mockGetBillingMetrics.mockRejectedValue(new Error("Failed to fetch"));

    render(<BillingPage />);

    await waitFor(() => {
      // Page renders err.message for Error instances
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });
  });

  it("should display fallback error state for non-Error rejection", async () => {
    mockGetBillingMetrics.mockRejectedValue("something went wrong");

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load billing data")).toBeInTheDocument();
    });
  });

  it("should show conversion rate", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText("25%")).toBeInTheDocument();
    });
  });

  it("should format invoice amounts correctly", async () => {
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText("$500.00")).toBeInTheDocument();
    });
  });

  it("should format coupon discounts correctly", async () => {
    mockGetActiveCoupons.mockResolvedValue([
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
    ]);

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText(/coupons/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: /coupons/i }));

    await waitFor(() => {
      expect(screen.getByText("$10.00 off")).toBeInTheDocument();
    });

    expect(screen.getByText("3 months")).toBeInTheDocument();
  });
});
