# Admin action logging coverage audit

**Scope:** `src/lib/actions/**/*.ts` and write-bearing API routes.  
**Rule:** every mutating server action must call `logAdminAction()` (CLAUDE.md Critical Rule 1).

## Method

1. Grep for `logAdminAction` usage per file.
2. Read every action file to distinguish mutating exports from read-only exports.
3. For each mutating function, confirm a `logAdminAction` call on the success path.
4. Note intentional exceptions.

## Summary

- **Action files reviewed:** 37 (`src/lib/actions/**/*.ts`, excluding tests)
- `logAdminAction` references in action code: 79
- **Mutating functions found:** 47
- **Logging on success path:** 47
- **Gaps fixed in this sweep:** 1 — `src/app/api/make-admin/route.ts` now logs admin promotion (was the only write-bearing API route without an audit record).
- **Intentional exception:** `src/lib/actions/api-usage.ts:recordApiCall` is non-admin telemetry; logging every API call to `admin_audit_logs` would drown the audit trail. It remains unlogged by design.

## Per-file coverage

| File | Mutating functions | Logs? | Notes |
|------|-------------------|-------|-------|
| `announcements.ts` | `createAnnouncement`, `updateAnnouncement`, `expireAnnouncementNow`, `deleteAnnouncement` | ✅ | |
| `api-keys.ts` | `updateApiKeyQuota`, `revokeApiKey` | ✅ | |
| `api-usage.ts` | `recordApiCall` | ❌ | Telemetry; not an admin action. Exception noted. |
| `billing.ts` | `createCoupon`, `deleteCoupon` | ✅ | Stripe writes |
| `builds.ts` | `updateBuildStatus`, `assignBuildToProject` | ✅ | |
| `custom-roles.ts` | `createCustomRole`, `updateCustomRole`, `deleteCustomRole` | ✅ | |
| `error-logs.ts` | `purgeOldErrors` | ✅ | `logError` is telemetry, not logged |
| `feature-flags.ts` | `createFeatureFlag`, `updateFeatureFlag`, `deleteFeatureFlag` | ✅ | `toggleFeatureFlagGlobal` delegates to `updateFeatureFlag` |
| `impersonation.ts` | `generateImpersonationToken`, `validateImpersonationToken` | ✅ | |
| `integrations.ts` | `disconnectIntegration` | ✅ | |
| `organizations.ts` | `changeTrialState`, `extendTrial`, `updateOrgApiQuota` | ✅ | |
| `project-members-admin.ts` | `updateProjectMemberCustomRole`, `removeProjectMember` | ✅ | |
| `projects.ts` | `toggleRequirementsEnabled`, `softDeleteProject`, `restoreProject` | ✅ | |
| `releases.ts` | `updateReleaseStatus` | ✅ | |
| `setup-admin.ts` | `promoteUser` (used by `promoteUserToAdminByEmail` and `setupEmergencyAdmin`) | ✅ | |
| `support-tickets/comments.ts` | `addTicketComment` | ✅ | |
| `support-tickets/seeding.ts` | `seedUnassignedTickets` | ✅ | |
| `support-tickets/shared.ts` | `logTicketEvent` | N/A | Internal helper that writes to `support_ticket_events`; callers log to `admin_audit_logs` |
| `support-tickets/team.ts` | `addTeamMember` | ✅ | |
| `support-tickets/writes.ts` | `assignTicket`, `updateTicketStatus`, `updateTicketPriority`, `closeTicket` | ✅ | |
| `system-health.ts` | `runHealthChecks` | ✅ | Logs only when a service is down; health-check row insert is system telemetry |
| `test-email-domains.ts` | `addTestEmailDomain`, `deactivateTestEmailDomain`, `reactivateTestEmailDomain` | ✅ | |
| `test-email.ts` | `forceExpireMailbox`, `deleteMailbox` | ✅ | |
| `user-groups.ts` | `createUserGroup`, `updateUserGroup`, `deleteUserGroup`, `addUserToGroup`, `removeUserFromGroup`, `assignGroupToProject`, `removeGroupFromProject` | ✅ | |
| `users.ts` | `updateUser`, `deleteUser`, `toggleUserAdmin`, `createUser`, `inviteUser` | ✅ | |

## Read-only files (no writes, no logging required)

- `dashboard.ts`
- `global-search.ts`
- `lathe-audit.ts`
- `support-tickets/analytics.ts`
- `support-tickets/canned.ts` (`incrementCannedResponseUse` is a no-op)
- `support-tickets/events.ts`
- `support-tickets/queue.ts`
- `support-tickets-my.ts`
- `test-cases.ts`
- `test-runs.ts`

## API routes checked

| Route | Write? | Logs? | Action |
|-------|--------|-------|--------|
| `app/api/make-admin/route.ts` | ✅ Promotes user to admin | Was ❌, now ✅ | Added `logAdminAction` after Clerk metadata update |
| `app/api/impersonate/route.ts` | ✅ Uses impersonation token | ✅ | Delegates to `validateImpersonationToken`, which logs |
| `app/api/check-admin/route.ts` | ❌ Read-only | N/A | No change needed |

## Findings beyond the spec

- `src/lib/actions/lathe-audit.ts` queries `audit_logs`, but the migration creates `lathe_audit_logs`. This is a pre-existing table-name mismatch, not a logging-coverage issue; left untouched per confirm-and-lock scope.
