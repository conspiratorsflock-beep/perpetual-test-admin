import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardContent from "../DashboardContent";
import type { BillingMetrics, AuditLog } from "@/types/admin";
import type { DashboardTrends } from "@/lib/actions/dashboard";

const mockBillingMetrics: BillingMetrics = {
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

const mockTrends: DashboardTrends = {
  labels: ["2024-01-01", "2024-01-02"],
  newUsers: [5, 10],
  newOrgs: [2, 3],
  apiCalls: [100, 200],
  userChange: { value: 5, trend: "up" },
  orgChange: { value: 3, trend: "up" },
};

const mockAuditLogs: AuditLog[] = [
  {
    id: "log-1",
    adminUserId: "user_1",
    adminEmail: "admin@example.com",
    action: "user.update",
    targetType: "user",
    targetId: "user_2",
    targetName: "test@example.com",
    metadata: {},
    createdAt: "2024-03-15T10:00:00Z",
  },
];

const mockActions = {
  getTotalUserCount: vi.fn(),
  getTotalOrgCount: vi.fn(),
  getBillingMetrics: vi.fn(),
  getApiCallsComparison: vi.fn(),
  getDashboardTrends: vi.fn(),
  getTrialsExpiringSoon: vi.fn(),
  getOpenTicketCount: vi.fn(),
  getAuditLogs: vi.fn(),
};

vi.mock("@/lib/actions/users", () => ({
  getTotalUserCount: mockActions.getTotalUserCount,
}));

vi.mock("@/lib/actions/organizations", () => ({
  getTotalOrgCount: mockActions.getTotalOrgCount,
  getTrialsExpiringSoon: mockActions.getTrialsExpiringSoon,
}));

vi.mock("@/lib/actions/api-usage", () => ({
  getApiCallsComparison: mockActions.getApiCallsComparison,
}));

vi.mock("@/lib/actions/billing", () => ({
  getBillingMetrics: mockActions.getBillingMetrics,
}));

vi.mock("@/lib/actions/dashboard", () => ({
  getDashboardTrends: mockActions.getDashboardTrends,
}));

vi.mock("@/lib/actions/support-tickets", () => ({
  getOpenTicketCount: mockActions.getOpenTicketCount,
}));

vi.mock("@/lib/audit/logger", () => ({
  getAuditLogs: mockActions.getAuditLogs,
}));

describe("DashboardContent", () => {
  it("renders populated data with stat cards, beta KPIs, and activity feed", () => {
    render(
      <DashboardContent
        userCount={1500}
        orgCount={300}
        billingMetrics={mockBillingMetrics}
        apiComparison={{ today: 5000, yesterday: 4500, change: 11.1, trend: "up" }}
        trends={mockTrends}
        trialsExpiring={5}
        openTickets={12}
        activityLogs={mockAuditLogs}
      />
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("$50,000")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();

    expect(screen.getByText("Beta Health")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument(); // active trials
    expect(screen.getByText("95")).toBeInTheDocument(); // paid orgs
    expect(screen.getByText("5")).toBeInTheDocument(); // trials expiring
    expect(screen.getByText("12")).toBeInTheDocument(); // open tickets

    expect(screen.getByText("user.update")).toBeInTheDocument();
    expect(screen.getByText("— test@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Feature Flags")).toBeInTheDocument();
  });

  it("renders zero/empty data correctly", () => {
    render(
      <DashboardContent
        userCount={0}
        orgCount={0}
        billingMetrics={{ ...mockBillingMetrics, mrr: 0, activeTrials: 0, paidOrgs: 0 }}
        apiComparison={{ today: 0, yesterday: 0, change: 0, trend: "neutral" }}
        trends={{
          labels: [],
          newUsers: [],
          newOrgs: [],
          apiCalls: [],
          userChange: { value: 0, trend: "neutral" },
          orgChange: { value: 0, trend: "neutral" },
        }}
        trialsExpiring={0}
        openTickets={0}
        activityLogs={[]}
      />
    );

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("No recent admin activity")).toBeInTheDocument();
    // Zero counts appear in multiple cards; assert specific ones by label context
    const apiCard = screen.getByText("API Calls Today").closest(".bg-slate-900");
    expect(apiCard?.textContent).toContain("0");
  });

  it("renders audit log entry without targetName but with targetType", () => {
    render(
      <DashboardContent
        userCount={100}
        orgCount={50}
        billingMetrics={mockBillingMetrics}
        apiComparison={{ today: 100, yesterday: 100, change: 0, trend: "neutral" }}
        trends={mockTrends}
        trialsExpiring={0}
        openTickets={0}
        activityLogs={[
          {
            id: "log-2",
            adminUserId: "user_1",
            adminEmail: "admin@example.com",
            action: "system.config_update",
            targetType: "system",
            targetId: null,
            targetName: null,
            metadata: {},
            createdAt: "2024-03-15T10:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText("system.config_update")).toBeInTheDocument();
    expect(screen.getByText("— system")).toBeInTheDocument();
  });

  it("shows alert styling when trials expiring or open tickets are non-zero", () => {
    render(
      <DashboardContent
        userCount={100}
        orgCount={50}
        billingMetrics={mockBillingMetrics}
        apiComparison={{ today: 100, yesterday: 100, change: 0, trend: "neutral" }}
        trends={mockTrends}
        trialsExpiring={3}
        openTickets={7}
        activityLogs={[]}
      />
    );

    const trialsLabel = screen.getByText("Trials Expiring ≤7d");
    const trialsCard = trialsLabel.closest("[class*='border-amber-500']");
    expect(trialsCard).toBeInTheDocument();
  });
});

describe("DashboardPage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockActions.getTotalUserCount.mockResolvedValue(1500);
    mockActions.getTotalOrgCount.mockResolvedValue(300);
    mockActions.getBillingMetrics.mockResolvedValue(mockBillingMetrics);
    mockActions.getApiCallsComparison.mockResolvedValue({
      today: 5000,
      yesterday: 4500,
      change: 11.1,
      trend: "up",
    });
    mockActions.getDashboardTrends.mockResolvedValue(mockTrends);
    mockActions.getTrialsExpiringSoon.mockResolvedValue(5);
    mockActions.getOpenTicketCount.mockResolvedValue(12);
    mockActions.getAuditLogs.mockResolvedValue({ logs: mockAuditLogs, count: 1 });
  });

  it("fetches all data in parallel and forwards props to DashboardContent", async () => {
    const { default: DashboardPage } = await import("../page");
    const result = await DashboardPage();
    const { container } = render(result);

    expect(mockActions.getTotalUserCount).toHaveBeenCalledTimes(1);
    expect(mockActions.getTotalOrgCount).toHaveBeenCalledTimes(1);
    expect(mockActions.getBillingMetrics).toHaveBeenCalledTimes(1);
    expect(mockActions.getApiCallsComparison).toHaveBeenCalledTimes(1);
    expect(mockActions.getDashboardTrends).toHaveBeenCalledWith(14);
    expect(mockActions.getTrialsExpiringSoon).toHaveBeenCalledTimes(1);
    expect(mockActions.getOpenTicketCount).toHaveBeenCalledTimes(1);
    expect(mockActions.getAuditLogs).toHaveBeenCalledWith({ limit: 8 });

    expect(container.textContent).toContain("Dashboard");
    expect(container.textContent).toContain("1,500");
    expect(container.textContent).toContain("$50,000");
  });
});
