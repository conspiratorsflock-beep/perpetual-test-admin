import {
  getTotalUserCount,
} from "@/lib/actions/users";
import {
  getTotalOrgCount,
  getTrialsExpiringSoon,
} from "@/lib/actions/organizations";
import {
  getApiCallsComparison,
} from "@/lib/actions/api-usage";
import {
  getBillingMetrics,
} from "@/lib/actions/billing";
import {
  getDashboardTrends,
} from "@/lib/actions/dashboard";
import {
  getOpenTicketCount,
} from "@/lib/actions/support-tickets";
import {
  getAuditLogs,
} from "@/lib/audit/logger";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  // The dashboard aggregates 8 independent sources; one flaky source
  // (Stripe blip, Clerk outage) must degrade its own slice, not blank the
  // landing page. Failed slices fall back to zeros and are listed in the
  // degraded-sources notice.
  const [
    userCountR,
    orgCountR,
    billingMetricsR,
    apiComparisonR,
    trendsR,
    trialsExpiringR,
    openTicketsR,
    auditResultR,
  ] = await Promise.allSettled([
    getTotalUserCount(),
    getTotalOrgCount(),
    getBillingMetrics(),
    getApiCallsComparison(),
    getDashboardTrends(14),
    getTrialsExpiringSoon(),
    getOpenTicketCount(),
    getAuditLogs({ limit: 8 }),
  ]);

  const degraded: string[] = [];
  function settle<T>(result: PromiseSettledResult<T>, name: string, fallback: T): T {
    if (result.status === "fulfilled") return result.value;
    console.error(`dashboard: ${name} unavailable:`, result.reason);
    degraded.push(name);
    return fallback;
  }

  const userCount = settle(userCountR, "user count", 0);
  const orgCount = settle(orgCountR, "org count", 0);
  const billingMetrics = settle(billingMetricsR, "billing metrics", {
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
  const apiComparison = settle(apiComparisonR, "API usage", {
    today: 0,
    yesterday: 0,
    change: 0,
    trend: "neutral" as const,
  });
  const trends = settle(trendsR, "trends", {
    labels: [],
    newUsers: [],
    newOrgs: [],
    apiCalls: [],
    userChange: { value: 0, trend: "neutral" as const },
    orgChange: { value: 0, trend: "neutral" as const },
  });
  const trialsExpiring = settle(trialsExpiringR, "expiring trials", 0);
  const openTickets = settle(openTicketsR, "open tickets", 0);
  const auditResult = settle(auditResultR, "admin activity", { logs: [], count: 0 });

  return (
    <DashboardContent
      userCount={userCount}
      orgCount={orgCount}
      billingMetrics={billingMetrics}
      apiComparison={apiComparison}
      trends={trends}
      trialsExpiring={trialsExpiring}
      openTickets={openTickets}
      activityLogs={auditResult.logs}
      degradedSources={degraded}
    />
  );
}
