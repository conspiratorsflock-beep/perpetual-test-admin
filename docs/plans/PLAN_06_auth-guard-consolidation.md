# Refactor round — Task 6: Consolidate requireAdmin + close 4 ungated action files
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Completed — ready for review · **Sequence:** first plan of the refactor round

Two parts, one commit-series. (a) **Mechanical consolidation:** 21 action
files each define a byte-identical local `requireAdmin` (`if (!(await
isCurrentUserAdmin())) throw new Error("Unauthorized")`); replace with one
shared export. (b) **SECURITY — close the gap files:** `billing.ts`,
`system-health.ts`, `support-tickets-my.ts`, `support-tickets-seeding.ts`
have NO admin check on any exported action (verified 2026-06-10). CLAUDE.md
Critical Rule 3: middleware alone is not sufficient — server actions are
directly invokable. `billing.ts` includes `createCoupon`/`deleteCoupon`
writes (they audit-log but never gate). Part (b) is a deliberate behavior
change: non-admins go from "allowed" to "rejected."

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`** (the
feature branch is retired; this and all future plans branch off main).

## Inventory (verified 2026-06-10 — verify again, then work through)
- Add `export async function requireAdmin()` to
  `src/lib/clerk/admin-check.ts` (it already exports `isCurrentUserAdmin`;
  keep the exact throw: `new Error("Unauthorized")`).
- 21 files with the identical local copy (grep `async function requireAdmin`
  to re-verify): announcements, api-keys, api-usage, audit-export, builds,
  custom-roles, dashboard, error-logs, feature-flags, integrations,
  lathe-audit, organizations, project-members-admin, projects, releases,
  support-tickets, test-cases, test-email, test-email-domains, test-runs,
  user-groups (all `src/lib/actions/*.ts`). Replace each local definition
  with an import. Also `src/app/api/announcements/reset-dismissals/route.ts`
  if it has its own copy — verify.
- UNGATED files to fix (part b): every exported async function in
  `src/lib/actions/billing.ts` (6 exports), `system-health.ts`,
  `support-tickets-my.ts`, `support-tickets-seeding.ts` gets
  `await requireAdmin()` as its first statement.
- EXCLUDE / leave inline (deliberately different semantics — do NOT convert,
  but VERIFY and report what each does): `users.ts:352`,
  `global-search.ts:36`, `setup-admin.ts:63` use inline `isCurrentUserAdmin`
  checks that may return/redirect instead of throwing. If any is byte-identical
  to the standard guard after all, converting it is fine — say so.
- EXCLUDE: `impersonation.ts` (different auth model — token-based),
  `error-logs.ts logError` / `api-usage.ts recordApiCall` if they are
  telemetry entry points — check whether gating them breaks a legitimate
  unauthenticated caller; if unsure, report instead of gating.

## What MUST be true / asserted
- Exactly ONE definition of `requireAdmin` in the repo (grep proves it);
  every consumer imports from `@/lib/clerk/admin-check`.
- Throw message stays byte-exact `"Unauthorized"` — existing tests assert it.
- NEW tests (this is the only test change allowed): for EACH newly gated
  file, one test per write function + one per read file proving non-admin →
  rejects AND no DB/Stripe call attempted. House style:
  `organizations.test.ts` non-admin tests.
- Existing suite: all 314 tests pass UNCHANGED (the consolidation must be
  invisible to them). Test count = 314 + exactly your new tests.
- Typecheck 0 errors.

## Branch workflow
1. Branch `kimi/auth-guard-consolidation` off latest `main`.
2. Commits: (1) shared export, (2–3) mechanical replacement in slices,
   (4) gate the 4 ungated files, (5) new tests, + this plan doc.
3. Full gate after every commit: `npm run test`, `npm run typecheck`.
4. Report (full-suite numbers, not per-file). Do NOT merge.

## Guardrails
- `admin-check.ts` is NOT a "use server" file — adding a plain async export
  is fine; do not add the directive.
- Part (b) changes behavior for ungated files. If you find a caller that
  legitimately needs unauthenticated access (cron, webhook, main-app call),
  STOP gating that function and report it — never guess about auth.
- Do not reorder anything else in the touched files; the diff per file
  should be: minus 3-line local guard, plus 1 import line (part a), or plus
  `await requireAdmin()` lines (part b).
- Stuck = report. Never weaken the guard to get green.

## Report back to Claude
Branch + commits; files converted vs left inline (with reasons); ungated
functions gated vs reported (with reasons); full gate numbers; verified vs
NOT verified (e.g. "no legitimate unauthenticated caller exists for billing
actions — checked admin-console callers only; reviewer verifies no main-app
caller"). Update `docs/plans/kimi-running-log.md`.

## Completion Summary
- **Branch:** `kimi/auth-guard-consolidation`
- **Base:** `main`
- **Commits:**
  - `6e13555` — add shared `requireAdmin()` export and replace local copies in 21 action files
  - `c919e41` — gate 4 previously ungated action files (`billing.ts`, `system-health.ts`, `support-tickets-my.ts`, `support-tickets-seeding.ts`)
  - `26771b3` — non-admin gate tests for the 4 newly gated files (14 tests)
- **Gate:**
  - `npm run test` → **281 passed / 0 failed / 47 skipped (328 total)**
  - `npm run typecheck` → **0 errors**
- **Converted (21 files):** announcements, api-keys, api-usage, audit-export, builds, custom-roles, dashboard, error-logs, feature-flags, integrations, lathe-audit, organizations, project-members-admin, projects, releases, support-tickets, test-cases, test-email, test-email-domains, test-runs, user-groups — all now import `requireAdmin` from `@/lib/clerk/admin-check`.
- **Left inline (verified, deliberate different semantics):**
  - `users.ts` — uses `isCurrentUserAdmin` for per-row access checks, not the standard throw.
  - `global-search.ts` — uses `isCurrentUserAdmin` to branch visibility, no throw.
  - `setup-admin.ts` — promotion utility uses `isCurrentUserAdmin` to allow first-admin bootstrapping.
  - `impersonation.ts` — excluded per plan (token-based auth model).
  - `error-logs.ts logError` and `api-usage.ts recordApiCall` — excluded per plan as potential telemetry entry points; not gated.
- **Gated (4 files, 14 functions):**
  - `billing.ts`: getBillingMetrics, getRecentInvoices, getActiveCoupons, getMRRHistory, createCoupon, deleteCoupon
  - `system-health.ts`: runHealthChecks, getHealthCheckHistory, getLatestHealthStatus
  - `support-tickets-my.ts`: getMyTickets, getAgentWorkload
  - `support-tickets-seeding.ts`: getUnassignedTickets, getAvailableAgents, seedUnassignedTickets
- **Verified:**
  - `grep -rn "async function requireAdmin" src/` returns exactly one hit: `src/lib/clerk/admin-check.ts`.
  - Throw message remains byte-exact `"Unauthorized"` (asserted in all new tests).
  - Zero changes to existing tests; full suite count increased from 314 to 328 by exactly the 14 new tests.
  - All newly gated functions have a non-admin test that asserts the mocked DB/Stripe client was NOT called.
- **NOT verified:** whether any main-app or unauthenticated caller (cron, webhook) legitimately invokes `billing.ts`, `system-health.ts`, `support-tickets-my.ts`, or `support-tickets-seeding.ts` actions. The gating assumes these are admin-console-only; reviewer should verify out-of-band.
