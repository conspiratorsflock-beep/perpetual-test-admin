# Lathe Studio → Admin Console Changes Directory

> **Purpose:** Catalog all changes made to `lathe-studio` that necessitate corresponding changes in `perpetual-test-admin` (this repo).  
> **Generated:** 2026-05-15  
> **Lathe Studio commits reviewed:** 329 (since 2025-02-01)

---

## 1. Executive Summary

`lathe-studio` has evolved from a generic SaaS template into a **full-featured test-management platform** (B2B SaaS for Jira-centric QA teams). `perpetual-test-admin` was originally built as a generic SaaS admin console. The two have diverged significantly. 

**Critical finding:** The admin console still assumes a **tiered pricing model** (`free` | `basic` | `pro` | `enterprise`) and a **Clerk-only user/org model**. Lathe Studio has moved to a **trial + paid-only model** with a rich domain model (test cases, runs, builds, releases, Jira integrations, CI/CD webhooks, etc.) and a **dual-role permission system** (Clerk org roles + project-level roles).

**Impact:** Many admin console features are now either broken-by-omission or actively misleading (e.g., org tier management, user roles, billing metrics).

---

## 2. Critical Mismatches (Actively Wrong)

### 2.1 Pricing & Billing Model Overhaul
**Lathe Studio Change:** `20260502_pricing_overhaul.sql` + commits `88f7228`, `450d0d8`, `17a1bb7`  
**Admin Console Status:** ❌ **BROKEN**

| Aspect | Lathe Studio (Current) | Admin Console (Stuck) |
|--------|----------------------|----------------------|
| Pricing model | Trial → Paid only (single plan) | Tiered: `free` / `basic` / `pro` / `enterprise` |
| Org tier field | `trial_lock_state` (`active`/`soft_locked`/`hard_locked`/`paid`) | `tier` enum on `AdminOrganization` type |
| Trial tracking | `trial_started_at`, `trial_ends_at`, `trial_extension_used`, `trial_warning_sent_at` | None |
| Stripe price | `stripe_price_id` on `organizations` table | Assumes multiple Stripe prices mapped to tiers |
| Seat limit | 3 users max during trial, unlimited when paid | No awareness |
| Admin action | `changeOrgTier()` in `src/lib/actions/organizations.ts` | Still offers tier change UI |

**Required Admin Changes:**
- Replace `OrgTier` type with `TrialLockState`
- Update `searchOrganizations()` and `getOrganizationById()` to query lathe-studio's `organizations` table (not just Clerk)
- Add trial management actions: extend trial, force-lock state, view trial timeline
- Update billing dashboard to show trial funnel (active trials → soft-locked → hard-locked → paid)
- Remove coupon creation if not applicable to single-plan model

### 2.2 Organization Data Source
**Lathe Studio Change:** `organizations` table with `clerk_org_id` field (migration `20250226` + `20260303000005_organizations_clerk_sync.sql`)  
**Admin Console Status:** ❌ **INCOMPLETE**

The admin console fetches orgs **exclusively from Clerk** (`client.organizations.getOrganizationList()`). It never queries the lathe-studio `organizations` table. This means:
- `tier` is hardcoded to `"free"` (`src/lib/actions/organizations.ts:63`)
- `mrr` is hardcoded to `0` (`src/lib/actions/organizations.ts:64`)
- `projects` array is empty (`src/lib/actions/organizations.ts:106`)
- `subscription` is null (`src/lib/actions/organizations.ts:107`)
- `usage` stats are zeroed (`src/lib/actions/organizations.ts:108-112`)

**Required Admin Changes:**
- All org actions must join Clerk data with `lathe-studio.organizations` table via `clerk_org_id`
- Fetch real project list from `projects` table
- Fetch real subscription status from `stripe_subscription_id` + Stripe API
- Compute usage from `api_usage_logs` or `api_usage_daily`

### 2.3 User Roles & Permissions
**Lathe Studio Change:** Dual-role system (`project_members` table is canonical + Clerk org roles)  
**Admin Console Status:** ❌ **INCOMPLETE**

Lathe Studio has:
- `users` table: `role` (deprecated for display), `is_billing_owner`
- `project_members` table: `clerk_user_id` + `role` (`owner`/`admin`/`tester`/`viewer`) per project

The admin console only shows Clerk org roles (`org:admin`, `org:member`). It has no visibility into:
- Which projects a user belongs to
- Their project-level roles
- Whether they are the billing owner

**Required Admin Changes:**
- Add project membership viewer to user detail page
- Show `is_billing_owner` flag
- Add ability to manage project memberships from admin

---

## 3. Missing Domain Entities (Complete Absence)

The admin console has zero awareness of the following lathe-studio entities. Any admin support request related to these requires direct DB access.

### 3.1 Test Management Core

| Entity | Lathe Studio Table | Admin Support Need |
|--------|-------------------|-------------------|
| **Projects** | `projects` | View all projects per org, soft-deleted projects, Jira linkage, requirements toggle |
| **Sections** | `sections` | Test suite hierarchy, nested sections |
| **Test Cases** | `test_cases` | Versioning, BDD/Gherkin content, automation status, approval workflow |
| **Test Runs** | `test_runs` | Execution status, inheritance policy, configuration testing count |
| **Test Case Executions** | `test_case_executions` | Result history, inheritance engine fields, defect refs |
| **Builds** | `builds` | CI/CD metadata (`cicd_provider`, `cicd_external_id`, `cicd_run_url`) |
| **Releases** | `releases` | Target dates, status, requirement linkage |
| **Requirements** | `requirements` | External ID linkage, source (manual/jira/linear/import) |

### 3.2 Integrations

| Integration | Lathe Studio Tables | Admin Support Need |
|------------|--------------------|-------------------|
| **Jira** | `jira_connections`, `jira_project_configs`, `jira_field_mappings`, `jira_push_logs` | OAuth status, project mappings, sync health |
| **Slack** | `slack_connections` | Connection status, notification rules |
| **Microsoft Teams** | `teams_connections` | Connection status |
| **Azure DevOps** | `azure_devops_connections` | Connection status |
| **CI/CD Webhooks** | `cicd_webhook_configs` | Provider configs, endpoint health |
| **Integration Notifications** | `integration_notification_rules`, `integration_notification_destinations`, `integration_event_log` | Rule management, delivery status, event log |

### 3.3 Platform & Infrastructure

| Feature | Lathe Studio Tables | Admin Support Need |
|--------|--------------------|-------------------|
| **API Keys** | `api_keys` | View/revoke org/project-scoped keys |
| **API Usage Logs** | `api_usage_logs` | Per-request logging, rate limit debugging |
| **Build Queue** | `build_queue` | Unassigned builds awaiting manual linkage |
| **Coverage Tags** | `tags`, `build_tags`, `test_case_tags` | Tag management, coverage reporting |
| **Code Changes** | `code_changes` | Files changed, breaking changes, security fixes between builds |
| **Devices** | `user_test_devices` | User's personal test devices |
| **Environments** | `project_environments` | Project-managed environments (Dev/Test/Staging/Prod) |
| **Sandbox Leads** | `sandbox_leads` | Marketing leads from demo usage |
| **Pending Invitations** | `pending_org_invitations` | Clerk invites with project auto-assignment metadata |
| **Test Case Templates** | `test_case_templates` | Reusable templates |
| **Weekly Report Subscribers** | `weekly_report_subscribers` | Email subscription management |

### 3.4 Org-Level Settings
**Lathe Studio Change:** `20260329_org_settings.sql`  
**Table:** `org_settings`

Per-org feature flags and defaults that admins should be able to override:
- `feature_requirements_enabled` — toggle requirements module
- `require_2fa` — enforce 2FA
- `session_timeout_minutes` — idle timeout
- `default_notification_channel` — email/slack/teams/none
- `notify_on_run_complete`, `notify_on_build_status_change`
- `default_inheritance_policy` — `lenient`/`strict`
- `default_coverage_target_pct` — 0-100
- `default_environment` — dev/staging/production/custom

**Required Admin Changes:**
- New "Org Settings" panel in organization detail page
- Override any org-level setting
- Audit log all overrides

---

## 4. Schema Evolution by Migration

The following lathe-studio migrations introduce features that require admin console updates. Listed in chronological order.

### Phase 1: Core Platform (Feb 2025)
| Migration | Feature | Admin Impact |
|-----------|---------|-------------|
| `20250226_initial_schema.sql` | Base tables: orgs, users, projects, sections, test_cases, test_runs, executions, releases, builds, project_members | Admin console needs to acknowledge these tables exist |
| `20250227_jira_integration.sql` | Jira OAuth + project config | Jira connection health dashboard |
| `20250228_bitbucket_integration.sql` | Bitbucket CI/CD | Bitbucket webhook health |
| `20260226000002_inheritance_engine.sql` | Status inheritance across builds | View inheritance chains in test run detail |
| `20260228_api_keys_and_build_queue.sql` | API keys + unassigned builds queue | API key management page; build queue viewer |
| `20260228000002_coverage_tags.sql` | Coverage tag system | Tag management |
| `20260228000003_project_members.sql` | Canonical project-level permissions | User detail → project memberships |
| `20260302_display_codes.sql` | Sequence numbers (TC-001, RUN-001, etc.) | Display codes in all admin lists |
| `20260302000002_slack_integration.sql` | Slack OAuth | Slack connection health |
| `20260303_audit_logs_table.sql` | Comprehensive audit logging | Admin console should read (not just write) `audit_logs` |
| `20260304_test_cases_automation_fields.sql` | Automation status + script ref | Test case detail → automation metadata |
| `20260305_bdd_gherkin_support.sql` | BDD/Gherkin test cases | Display gherkin content in test case viewer |
| `20260305000002_cicd_integrations.sql` | GitHub/GitLab/Jenkins/Azure/Bitbucket webhooks | CI/CD integration health dashboard |
| `20260305000003_configuration_testing.sql` | Multi-config test runs | Config count in test run lists |
| `20260305000007_mobile_sync_api.sql` | Mobile sync API | API usage tracking should include mobile sync |
| `20260305000008_test_case_versioning.sql` | Version history + approval workflow | Version timeline viewer; approve/revert versions |
| `20260306000002_sandbox_leads.sql` | Demo lead capture | Leads dashboard for sales ops |
| `20260307_teams_integration.sql` | MS Teams OAuth | Teams connection health |
| `20260308_pricing_lead_seats.sql` | Lead seat tracking | Seat usage vs lead count |
| `20260309_azure_devops_integration.sql` | Azure DevOps OAuth + webhooks | Azure DevOps health |
| `20260311_support_tickets.sql` | Support ticket system | **Already partially mirrored in admin** — verify schema parity |
| `20260312_requirements.sql` | Requirements management | Requirements module toggle + viewer |
| `20260314_requirements_enabled_flag.sql` | Per-project requirements toggle | Admin can enable/disable for projects |
| `20260329_org_settings.sql` | Org-level settings table | **New admin panel required** |
| `20260331_test_case_templates.sql` | Reusable templates | Template management |
| `20260331_weekly_report_subscribers.sql` | Weekly report emails | Subscriber management |
| `20260429_devices_and_environments.sql` | User devices + project environments | Device/environment viewer |
| `20260501_integration_notification_tables.sql` | Integration notification rules + event log | Rule management + delivery log viewer |
| `20260501_pending_org_invitations.sql` | Pending invites with project auto-assignment | Invitation management |
| `20260502_pricing_overhaul.sql` | **Trial + paid only model** | **Critical — see §2.1** |
| `20260515_security_advisor_remediation.sql` | RLS hardening, GraphQL revocation | Security config viewer |

---

## 5. Shared Tables — Schema Parity Check

Both projects define some of the same tables. The admin console must ensure its migrations are compatible with lathe-studio's.

| Table | In Lathe Studio? | In Admin? | Status |
|-------|-----------------|-----------|--------|
| `organizations` | ✅ (source of truth) | ❌ (reads from Clerk only) | **MISMATCH** |
| `users` | ✅ (source of truth) | ❌ (reads from Clerk only) | **MISMATCH** |
| `projects` | ✅ | ❌ (placeholder only) | **MISSING** |
| `support_tickets` | ✅ (`20260311`) | ✅ (`20260313`) | ⚠️ **VERIFY PARITY** |
| `support_ticket_comments` | ✅ | ✅ | ⚠️ **VERIFY PARITY** |
| `support_ticket_events` | ✅ | ✅ | ⚠️ **VERIFY PARITY** |
| `support_canned_responses` | ✅ | ✅ | ⚠️ **VERIFY PARITY** |
| `support_team_members` | ✅ | ✅ | ⚠️ **VERIFY PARITY** |
| `support_sla_config` | ✅ | ✅ | ⚠️ **VERIFY PARITY** |
| `admin_announcements` | ✅ (`20260307`) | ✅ (`20260310`) | ⚠️ **VERIFY PARITY** |
| `feature_flags` | ❌ (uses `org_settings`) | ✅ (`20260310`) | **DIVERGENT** |
| `admin_audit_logs` | ❌ | ✅ (`20260310`) | Admin-only table (OK) |
| `impersonation_tokens` | ❌ | ✅ (`20260310`) | Admin-only table (OK) |
| `system_health_checks` | ❌ | ✅ (`20260310`) | Admin-only table (OK) |
| `admin_error_logs` | ❌ | ✅ (`20260310`) | Admin-only table (OK) |
| `api_usage_daily` | ❌ | ✅ (`20260312`) | Admin-only table (OK) |
| `system_settings` | ❌ | ✅ (`20260314`) | Admin-only table (OK) |

**Action:** Run a schema diff on `support_tickets`, `support_ticket_comments`, `support_ticket_events`, `admin_announcements` to ensure column names and types match.

---

## 6. Authentication & Authorization Gaps

### 6.1 Impersonation
The admin console has a full impersonation token system (`impersonation_tokens` table + `/api/impersonate` route).  
**Question:** Does lathe-studio have a corresponding `/api/impersonate` route to validate these tokens?  
**If not:** The impersonation feature is admin-only and cannot reach the main app.

### 6.2 Admin Announcements
Both projects have `admin_announcements` tables.  
**Question:** Does lathe-studio read from the same table the admin console writes to?  
**If yes:** Schema must be identical. Lathe-studio's migration includes `target_tiers`, `target_orgs`, scheduling, and visual styles.

### 6.3 Feature Flags
- **Admin console:** Global `feature_flags` table with org/user whitelist.
- **Lathe Studio:** Per-org settings in `org_settings` table (`feature_requirements_enabled`).

**Divergence:** Two different feature flag systems. Admin console's `is_feature_enabled()` SQL function is not used by lathe-studio. Lathe-studio checks `org_settings.feature_requirements_enabled` directly.

---

## 7. Recommended Implementation Priority

### P0 — Critical (Broken Today)
1. **Pricing model sync** — Replace tiered model with trial+paid state machine
2. **Organization data source** — Query lathe-studio DB for real org data (trial state, projects, usage)
3. **User roles** — Show project memberships and billing owner status

### P1 — High (Support Burden)
4. **Project management** — List/search projects, view soft-deleted, toggle `requirements_enabled`
5. **API Keys** — View/revoke org and project keys
6. **Org Settings** — Override panel for all `org_settings` fields
7. **Support ticket schema parity** — Verify columns match lathe-studio exactly

### P2 — Medium (Operational Visibility)
8. **Integration health dashboard** — Jira, Slack, Teams, Azure DevOps connection status
9. **Build Queue** — View unassigned builds, manual assignment
10. **Sandbox Leads** — Lead dashboard for sales/marketing
11. **Audit log viewer** — Read lathe-studio's `audit_logs` table (separate from admin's `admin_audit_logs`)

### P3 — Low (Nice to Have)
12. **Test management read-only views** — Test cases, runs, builds, releases (for deep customer support)
13. **Coverage tags** — Tag management
14. **Devices & Environments** — Viewer for support debugging
15. **Test case templates** — Template management
16. **Weekly report subscribers** — Subscriber list

---

## 8. Database Architecture Note

**Current State:** Both projects have their own `supabase/migrations/` directories. The AGENTS.md states they share a Supabase project, but lathe-studio's migrations do not include admin tables (`admin_audit_logs`, `feature_flags`, `impersonation_tokens`, etc.), and the admin console's migrations do not include lathe-studio tables.

**Risk:** If both migration chains are applied to the same database, they will conflict on shared tables (`support_tickets`, `admin_announcements`) and miss each other's tables.

**Recommended Resolution:**
- Apply **lathe-studio migrations first** as the "application schema" source of truth.
- Apply **admin console migrations second** for admin-only tables.
- For shared tables (`support_tickets`, `admin_announcements`), pick one project's migration as canonical and remove/align the other.
- Alternatively, maintain a unified migration directory in a third location (e.g., infra repo).

---

## 9. Files Requiring Changes (Checklist)

### Types
- [ ] `src/types/admin.ts` — Remove `OrgTier`, add `TrialLockState`, add all missing entity types

### Server Actions
- [ ] `src/lib/actions/organizations.ts` — Query lathe-studio DB; replace tier with trial state
- [ ] `src/lib/actions/users.ts` — Show project memberships, `is_billing_owner`
- [ ] `src/lib/actions/billing.ts` — Add trial metrics, remove tiered assumptions
- [ ] `src/lib/actions/feature-flags.ts` — Consider `org_settings` integration
- [ ] `src/lib/actions/projects.ts` — **Create new** — project search/detail/management
- [ ] `src/lib/actions/api-keys.ts` — **Create new** — API key management
- [ ] `src/lib/actions/org-settings.ts` — **Create new** — org settings override
- [ ] `src/lib/actions/integrations.ts` — **Create new** — integration health
- [ ] `src/lib/actions/audit-logs.ts` — **Create new** — read lathe-studio audit logs

### Pages & Navigation
- [ ] `src/components/layout/AdminSidebar.tsx` — Add Projects, Integrations, Org Settings, API Keys
- [ ] `src/app/organizations/[id]/page.tsx` — Add trial timeline, org settings tab, project list
- [ ] `src/app/users/[id]/page.tsx` — Add project memberships, billing owner badge
- [ ] `src/app/projects/` — **Create new route**
- [ ] `src/app/integrations/` — **Create new route**
- [ ] `src/app/api-keys/` — **Create new route**

### Database
- [ ] Verify `support_tickets` schema parity between projects
- [ ] Verify `admin_announcements` schema parity between projects
- [ ] Ensure admin-only migrations can run on lathe-studio's database

---

*End of directory. Last updated: 2026-05-15.*
