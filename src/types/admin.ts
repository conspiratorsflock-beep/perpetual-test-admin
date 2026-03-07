import type { ReactNode } from "react";

// ─── Navigation ────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

// ─── Users ─────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  isAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export interface UserWithDetails extends AdminUser {
  organizations: UserOrganization[];
  lastActivity: string | null;
  isImpersonating?: boolean;
}

export interface UserOrganization {
  id: string;
  name: string;
  role: string;
}

// ─── Organizations ──────────────────────────────────────────────────────────

export interface AdminOrganization {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  memberCount: number;
  tier: OrgTier;
  mrr: number;
  createdAt: string;
}

export type OrgTier = "free" | "basic" | "pro" | "enterprise";

export interface OrganizationWithDetails extends AdminOrganization {
  members: OrgMember[];
  projects: OrgProject[];
  subscription: OrgSubscription | null;
  usage: OrgUsage;
}

export interface OrgMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  joinedAt: string;
}

export interface OrgProject {
  id: string;
  name: string;
  createdAt: string;
}

export interface OrgSubscription {
  id: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface OrgUsage {
  apiCallsThisMonth: number;
  storageUsedBytes: number;
  lastActiveAt: string | null;
}

// ─── Projects ───────────────────────────────────────────────────────────────

export interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  updatedAt: string;
  testCount: number;
  lastActivityAt: string | null;
}

// ─── Feature Flags ──────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledGlobally: boolean;
  enabledForOrgs: string[];
  enabledForUsers: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export type AuditTargetType = "user" | "organization" | "project" | "feature_flag" | "system" | "billing" | "announcement";

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string | null;
  targetName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Dashboard Metrics ──────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalUsers: number;
  activeOrgs: number;
  mrr: number;
  apiCallsToday: number;
  userGrowth: number;     // percentage vs last month
  orgGrowth: number;
  mrrGrowth: number;
  apiGrowth: number;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

export interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

// ─── Announcements ──────────────────────────────────────────────────────────

export type AnnouncementType = "info" | "warning" | "critical" | "maintenance";

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetTiers: string[];
  targetOrgs: string[];
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

// ─── System Health ──────────────────────────────────────────────────────────

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface SystemHealthCheck {
  id: string;
  serviceName: string;
  status: ServiceStatus;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

// ─── Error Logs ─────────────────────────────────────────────────────────────

export interface AdminErrorLog {
  id: string;
  errorType: string;
  message: string;
  stackTrace: string | null;
  userId: string | null;
  orgId: string | null;
  path: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Billing ────────────────────────────────────────────────────────────────

export interface BillingMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  customerId: string;
  customerName: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  pdfUrl: string | null;
}

export interface StripeCoupon {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  valid: boolean;
  createdAt: string;
  redeemBy: string | null;
}

// ─── Impersonation ──────────────────────────────────────────────────────────

export interface ImpersonationToken {
  id: string;
  tokenHash: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

// ─── Docs ───────────────────────────────────────────────────────────────────

export interface DocPage {
  slug: string;
  title: string;
  content: string;
  category: string;
  order: number;
}
