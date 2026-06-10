# Test-suite repair round — Task 4: New unit tests for organizations server actions
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER Plan 03 merges (suite must be green first)

`src/lib/actions/organizations.ts` (496 lines) is the core of the trial+paid
business model and has ZERO tests. Create
`src/lib/actions/__tests__/organizations.test.ts`. **Confirm-and-lock**:
pure test-addition; the source must NOT change; suspected source bugs are
reported, not fixed.

Read `delegation-kit/KIMI_FEEDBACK.md` first. Copy the house style from
`src/lib/actions/__tests__/impersonation.test.ts` (local chainable Supabase
mock per query shape, explicit error paths, `logAdminAction` assertions).

**IMPORTANT — base branch:** `feat/typed-supabase-client-and-perf` after
Plan 03 merges (the suite is green at that point — keep it green).

## Inventory (verified 2026-06-10 — verify line numbers again, then work through)
Exported functions in `src/lib/actions/organizations.ts`:
- `searchOrganizations` (:25) — Clerk org list + DB enrichment; pagination
- `getOrganizationById` (:85) — detail + members
- `changeTrialState` (:179) — resolves clerk org id → org UUID
  (`getOrgUuidFromClerkId`), updates `trial_lock_state`, logs
  `org.trial_state_change`; throws "Organization not found in database" when
  unresolvable
- `extendTrial` (:212) — ONE-TIME-ONLY policy: throws for `paid` orgs and
  when `trial_extension_used` is set; computes `newEnd = currentEnd + days`,
  sets `trial_extension_used: true`, logs `org.extend_trial`, returns
  `{ newTrialEndsAt }`
- `updateOrgApiQuota` (:267)
- `getOrgApiUsage` (:302)
- `getTrialMetrics` (:333)
- `getTotalOrgCount` (:379)
- `getTrialsExpiringSoon` (:389)
- `exportOrganizationsToCSV` (:413)

PRIORITY ORDER (write-path behavior first): changeTrialState, extendTrial,
updateOrgApiQuota, then searchOrganizations + getOrganizationById, then the
metric/count/CSV reads as time allows — deferring the read-only tail is
acceptable IF reported; deferring write-path tests is not.

## What MUST be true / asserted (minimum per function)
- **Auth before action:** every function awaits `requireAdmin()` — at least
  one test per write function proving a non-admin/unauthenticated context
  rejects AND the DB write was never attempted (override the Clerk mock so
  `getUser` returns `publicMetadata: { isAdmin: false }`, or mock
  `@/lib/clerk/admin-check`).
- **Wire values:** `trial_lock_state` ∈ `active | soft_locked | hard_locked |
  paid` — assert the exact strings in the `.update()` payload; these are DB
  wire values shared with the main app, never display strings.
- **extendTrial policy table** (each its own test): paid org → throws;
  extension already used → throws (and no update issued in both); null
  `trial_ends_at` → extends from now; happy path → update payload has
  `trial_extension_used: true` and the returned `newTrialEndsAt` is exactly
  `currentEnd + days * 86400s`.
- **Audit invariant:** every write asserts `logAdminAction` called with the
  exact `action` string and meaningful metadata; read paths assert it is NOT
  called.
- **Error paths:** for every Supabase call, a test where it returns
  `{ error }` → the documented throw (assert the message prefix).
- Gate: suite 0 failed (baseline-after-Plan-03 + exactly your new tests —
  state the count), typecheck 0 errors.

## Branch workflow
1. Branch `kimi/organizations-action-tests` off latest
   `feat/typed-supabase-client-and-perf`.
2. Commit in slices (write-path tests / read-path tests / this plan doc).
3. Gate after every commit: `npm run test`, `npm run typecheck`.
4. Report. Do NOT merge.

## Guardrails
- **Two ID namespaces:** functions take the CLERK org id and resolve to the
  DB UUID via `getOrgUuidFromClerkId`. Mock both hops; assert
  `logAdminAction.targetId` carries the CLERK id (current behavior) — if you
  believe that's wrong, report, don't change.
- Derive expectations from the source's contracts and this plan, NOT from
  whatever the mock happens to return — a test that asserts the mock is a
  test of nothing.
- Time-dependent assertions (extendTrial date math, getTrialsExpiringSoon):
  use `vi.useFakeTimers()`/fixed dates, no `Date.now()` slack windows.
- Column names in fixtures must match the live `organizations` table
  (`trial_ends_at`, `trial_extension_used`, `trial_lock_state`, …) — verify
  against `docs/plans/Schema.md` / migrations; stale fixture columns are this
  repo's proven false-pass mode.
- Don't mock `@/lib/audit/logger` so loosely that the action-string
  assertions can't fail (use `vi.fn()` and assert call args, as
  impersonation.test.ts does).
- Stuck = `// CAST-DEBT:` + reason + report. Never weaken an assertion.

## Report back to Claude
- Branch + commits; functions covered vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence — suspected source bugs
  especially); gate numbers; **verified vs NOT verified** (e.g. "fixture
  column names vs live DB — reviewer re-verifies; Clerk API response shapes
  in searchOrganizations — mocked, not verified"). Update
  `docs/plans/kimi-running-log.md`.
