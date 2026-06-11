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
  const [
    userCount,
    orgCount,
    billingMetrics,
    apiComparison,
    trends,
    trialsExpiring,
    openTickets,
    auditResult,
  ] = await Promise.all([
    getTotalUserCount(),
    getTotalOrgCount(),
    getBillingMetrics(),
    getApiCallsComparison(),
    getDashboardTrends(14),
    getTrialsExpiringSoon(),
    getOpenTicketCount(),
    getAuditLogs({ limit: 8 }),
  ]);

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
    />
  );
}
