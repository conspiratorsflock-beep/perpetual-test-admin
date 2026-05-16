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
  isBillingOwner?: boolean;
  projectMemberships?: ProjectMembership[];
}

export interface UserOrganization {
  id: string;
  name: string;
  role: string;
}

export interface ProjectMembership {
  projectId: string;
  projectName: string;
  role: "owner" | "admin" | "tester" | "viewer";
}

// ─── Organizations ──────────────────────────────────────────────────────────

export type TrialLockState = "active" | "soft_locked" | "hard_locked" | "paid";

export interface AdminOrganization {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  memberCount: number;
  trialLockState: TrialLockState;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialExtensionUsed: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  mrr: number;
  createdAt: string;
}

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
  projectCode: string | null;
  jiraProjectKey: string | null;
  requirementsEnabled: boolean;
  orgId: string;
  orgName: string;
  memberCount: number;
  testCaseCount: number;
  testRunCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Keys ──────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  orgId: string;
  projectId: string | null;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

// ─── Org Settings ──────────────────────────────────────────────────────────

export interface OrgSettings {
  id: string;
  orgId: string;
  featureRequirementsEnabled: boolean;
  require2fa: boolean;
  sessionTimeoutMinutes: number;
  defaultNotificationChannel: "email" | "slack" | "teams" | "none";
  notifyOnRunComplete: boolean;
  notifyOnBuildStatusChange: boolean;
  defaultInheritancePolicy: "lenient" | "strict";
  defaultCoverageTargetPct: number;
  defaultEnvironment: "dev" | "staging" | "production" | "custom";
  updatedAt: string;
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

export type AuditTargetType =
  | "user"
  | "organization"
  | "project"
  | "feature_flag"
  | "system"
  | "billing"
  | "announcement"
  | "support_ticket"
  | "api_key"
  | "integration"
  | "build_queue"
  | "lead"
  | "org_setting";

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
  userGrowth: number; // percentage vs last month
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
  linkUrl: string | null;
  linkText: string | null;
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
  activeTrials: number;
  softLockedOrgs: number;
  hardLockedOrgs: number;
  paidOrgs: number;
  trialToPaidConversionRate: number;
  avgTimeToConversion: number;
}

export interface TrialMetrics {
  totalOrgs: number;
  activeTrials: number;
  softLocked: number;
  hardLocked: number;
  paid: number;
  avgDaysRemaining: number;
  conversionRate: number;
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

// ─── Support Tickets ────────────────────────────────────────────────────────

export type TicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed" | "escalated";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "billing" | "account" | "technical" | "feature_request" | "bug_report" | "question" | "other";

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  referenceCode: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  orgId: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  assignedAt: string | null;
  slaDeadline: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  source: string;
  tags: string[];
  browserInfo: string | null;
  osInfo: string | null;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorEmail: string;
  authorName: string | null;
  isAgent: boolean;
  isInternal: boolean;
  isEdited: boolean;
  content: string;
  attachments: Array<{ filename: string; url: string; mimeType: string; size: number }>;
  createdAt: string;
  editedAt: string | null;
  editedBy: string | null;
}

export interface SupportTicketEvent {
  id: string;
  ticketId: string;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
  performedByEmail: string | null;
  createdAt: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string | null;
  useCount: number;
}

export interface SupportTeamMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "agent" | "viewer";
  isAvailable: boolean;
  maxOpenTickets: number;
  skills: string[];
  notifyOnNewTicket: boolean;
  notifyOnAssigned: boolean;
  isOnline?: boolean;
  avatarUrl?: string | null;
}

// ─── Ticket Assignment & Seeding ────────────────────────────────────────────

export interface TicketSeedingConfig {
  strategy: "round_robin" | "workload_balanced" | "skill_based";
  respectSchedule: boolean;
  maxPerAgent: number;
  categories: string[];
}

export interface TicketSeedingResult {
  seeded: number;
  assignments: {
    ticketId: string;
    agentId: string;
    agentName: string;
  }[];
  errors: string[];
}

// ─── Agent Scheduling ───────────────────────────────────────────────────────

export interface AgentSchedule {
  id: string;
  agentId: string;
  timezone: string;
  isActive: boolean;
  shifts: ScheduleShift[];
  exceptions: ScheduleException[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleShift {
  id: string;
  scheduleId: string;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  isActive: boolean;
}

export interface ScheduleException {
  id: string;
  scheduleId: string;
  exceptionDate: string; // YYYY-MM-DD
  type: "pto" | "holiday" | "custom";
  note?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
}

// ─── Agent Availability ─────────────────────────────────────────────────────

export interface AgentAvailability {
  agentId: string;
  agentName: string;
  isOnline: boolean;
  isOnDuty: boolean;
  timezone: string;
  currentWorkload: number; // Open tickets
  maxCapacity: number;
  skills: string[];
}

// ─── Extended Ticket with Assignment Info ───────────────────────────────────

export interface SupportTicketWithAssignee extends Omit<SupportTicket, "assignedTo" | "assignedAt"> {
  assignedTo?: SupportTeamMember;
  assignedAt?: string;
  autoAssigned: boolean;
  recentComments?: SupportTicketComment[];
  slaStatus: "healthy" | "at_risk" | "breached";
  slaMinutesRemaining: number;
}

// ─── Ticket Counts ──────────────────────────────────────────────────────────

export interface TicketCounts {
  total: number;
  open: number;
  pending: number;
  inProgress: number;
  resolved: number;
  closed: number;
  escalated: number;
  unassigned: number;
  overdue: number;
}

export type IntegrationStatus = "active" | "expired" | "error" | "not_configured";
export type IntegrationProvider = "jira" | "github" | "gitlab" | "slack" | "teams" | "custom";

// ─── Integration Health ─────────────────────────────────────────────────────

export interface IntegrationHealth {
  id: string;
  provider: string;
  orgId: string;
  orgName: string;
  projectId: string | null;
  projectName: string | null;
  status: IntegrationStatus;
  connectedAt: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type BuildQueueItemStatus = "pending" | "running" | "success" | "failed" | "cancelled";

// ─── Build Queue ────────────────────────────────────────────────────────────

export interface BuildQueueItem {
  id: string;
  name: string;
  cicdProvider: string;
  cicdExternalId: string;
  assignedProjectId: string | null;
  projectName: string | null;
  status: BuildQueueItemStatus;
  receivedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  branch: string | null;
  commitSha: string | null;
  authorEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Sandbox Leads ──────────────────────────────────────────────────────────

export interface SandboxLead {
  id: string;
  email: string;
  orgId: string | null;
  orgName: string | null;
  source: string;
  notes: string | null;
  convertedAt: string | null;
  createdAt: string;
}

// ─── Test Cases ─────────────────────────────────────────────────────────────

export interface TestCaseStep {
  order: number;
  action: string;
  expectedResult: string;
}

export type TestCasePriority = "p0" | "p1" | "p2" | "p3";
export type TestCaseStatus = "draft" | "review" | "active" | "deprecated";
export type AutomationStatus = "not_automated" | "automated" | "partial";
export type ExecutionMode = "manual" | "automated";
export type TestCaseType = "standard" | "gherkin";

export interface TestCase {
  id: string;
  projectId: string;
  sectionId: string | null;
  title: string;
  description: string | null;
  priority: TestCasePriority;
  status: TestCaseStatus;
  steps: TestCaseStep[];
  isAdhoc: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  tcSequenceNumber: number;
  preconditions: string | null;
  externalId: string | null;
  automationStatus: AutomationStatus;
  executionMode: ExecutionMode;
  version: number;
  isLatestVersion: boolean;
  previousVersionId: string | null;
  versionNotes: string | null;
  testCaseType: TestCaseType;
  gherkinContent: string | null;
  gherkinScenarioType: string | null;
}

// ─── Test Runs ──────────────────────────────────────────────────────────────

export type TestRunStatus = "planned" | "running" | "completed" | "failed" | "cancelled";
export type InheritancePolicy = "snapshot" | "live";

export interface TestRun {
  id: string;
  projectId: string;
  releaseId: string | null;
  buildId: string | null;
  name: string;
  description: string | null;
  environment: string | null;
  customEnvironment: string | null;
  status: TestRunStatus;
  inheritancePolicy: InheritancePolicy;
  parentRunId: string | null;
  createdBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  runSequenceNumber: number | null;
  configurationCount: number;
}

// ─── Lathe Studio Audit Logs ────────────────────────────────────────────────

export interface LatheAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedBy: string;
  performedByEmail: string | null;
  createdAt: string;
}
