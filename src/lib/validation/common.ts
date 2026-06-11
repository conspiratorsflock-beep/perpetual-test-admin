import { z } from "zod";

export const uuid = z.string().uuid();

export const clerkId = z.string().min(1).max(64);

export function boundedString(max: number) {
  return z.string().trim().max(max);
}

export const isoDate = z.string().datetime({ offset: true });

// Enums derived from src/types/admin.ts
export const trialLockState = z.enum(["active", "soft_locked", "hard_locked", "paid"]);

export const ticketStatus = z.enum([
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
  "escalated",
]);

export const ticketPriority = z.enum(["low", "medium", "high", "urgent"]);

export const ticketCategory = z.enum([
  "billing",
  "account",
  "technical",
  "feature_request",
  "bug_report",
  "question",
  "other",
]);

export const buildStatus = z.enum(["planned", "running", "completed", "failed", "cancelled"]);

export const buildSource = z.enum(["manual", "cicd", "api"]);

export const releaseStatus = z.enum(["planned", "in_progress", "released", "archived"]);

export const announcementType = z.enum(["info", "warning", "critical", "maintenance"]);

export const serviceStatus = z.enum(["healthy", "degraded", "down"]);

export const integrationStatus = z.enum([
  "connected",
  "error",
  "disconnected",
  "refreshing",
  "pending",
]);

export const integrationProvider = z.enum([
  "jira",
  "slack",
  "teams",
  "azure_devops",
  "github",
  "gitlab",
  "custom",
]);

export const supportTeamRole = z.enum(["admin", "agent", "viewer"]);

export const seedingStrategy = z.enum(["round_robin", "workload_balanced", "skill_based"]);

export const testCasePriority = z.enum(["p0", "p1", "p2", "p3"]);

export const testCaseStatus = z.enum(["draft", "review", "active", "deprecated"]);

export const automationStatus = z.enum([
  "not_automated",
  "candidate",
  "in_progress",
  "automated",
  "deprecated",
]);

export const executionMode = z.enum(["manual", "automated", "hybrid"]);

export const testCaseType = z.enum(["standard", "gherkin"]);

export const gherkinScenarioType = z.enum(["scenario", "scenario_outline", "background"]);

export const testRunStatus = z.enum(["planned", "running", "completed", "failed", "cancelled"]);

export const inheritancePolicy = z.enum(["snapshot", "live"]);

export const defaultNotificationChannel = z.enum(["email", "slack", "teams", "none"]);

export const defaultEnvironment = z.enum(["dev", "staging", "production", "custom"]);

export const defaultInheritancePolicy = z.enum(["lenient", "strict"]);

export const projectRole = z.enum(["owner", "admin", "tester", "viewer"]);

// Length-cap helpers (generous, never reject legitimate admin input)
export const nameString = boundedString(500);
export const descriptionString = boundedString(10_000);
export const errorMessageString = boundedString(50_000);
export const urlString = boundedString(2_048);
export const secretString = boundedString(128);
export const emailString = boundedString(254).email();
