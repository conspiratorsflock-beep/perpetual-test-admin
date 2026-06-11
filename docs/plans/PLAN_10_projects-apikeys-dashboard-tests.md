# Refactor round — Task 10: New unit tests for projects, api-keys, and dashboard actions
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** ready_for_review · **Sequence:** start AFTER PLAN_09 merges

Three small untested action files, one plan. Create
`projects.test.ts`, `api-keys.test.ts`, `dashboard.test.ts` under
`src/lib/actions/__tests__/`. **Confirm-and-lock**: source must NOT change.
House style: `organizations.test.ts` / `support-tickets.test.ts`.

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`.**

## Inventory (verified 2026-06-10 — verify, then work through)
- `projects.ts` (226 lines): searchProjects (:23), getProjectById (:89),
  toggleRequirementsEnabled (:136), softDeleteProject (:159),
  restoreProject (:181), getProjectMembers (:203).
  Soft-delete/restore are the destructive paths — payload assertions
  (`deleted_at` set vs cleared) + audit strings + non-admin gates are the
  core value here.
- `api-keys.ts` (130 lines): enumerate exports yourself; revocation is the
  write path — same treatment.
- `dashboard.ts` (100 lines): getDashboardTrends and friends — read-only;
  assert series shape (14 entries, date keys), zero/error fallbacks, and
  that reads never call logAdminAction.

## What MUST be true / asserted (minimum, per file)
- Non-admin → rejects, no DB call (write functions at minimum; one read per
  file).
- Every write asserts `logAdminAction` with the exact action string from the
  source; every read asserts NOT called.
- Wire values byte-exact in update payloads (e.g. soft delete sets
  `deleted_at` to an ISO string — assert the column name and shape, not just
  "update was called").
- Error paths: each Supabase `{ error }` → the documented throw/fallback.
- Date-dependent logic (dashboard 14-day series, deleted_at timestamps):
  fake timers, pinned dates.
- Gate: full suite green (state baseline + your delta), typecheck clean.

## Branch workflow
1. Branch `kimi/projects-apikeys-dashboard-tests` off latest `main`.
2. One commit per test file, + this plan doc. Full gate after every commit.
3. Report. Do NOT merge.

## Guardrails
- Three files is the scope cap — if any file balloons past ~25 tests, stop
  adding and report what you'd cover next instead.
- Fixture columns vs live DB is the standing trap — flag every table you
  fixture under NOT verified for the reviewer's live-DB check
  (`projects`, `api_keys`, whatever dashboard reads).
- Per-table mock routing where a function touches multiple tables.
- Stuck = report. Never weaken an assertion.

## Report back to Claude
Branch + commits; per-file coverage counts; real findings (these files have
never had tests — expect something); full gate numbers; verified vs NOT
verified (tables fixtured, for the live-DB check). Update
`docs/plans/kimi-running-log.md`.
